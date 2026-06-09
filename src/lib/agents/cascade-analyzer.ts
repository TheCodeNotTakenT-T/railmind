import { generateText, tool } from 'ai'
import { groq } from '@ai-sdk/groq'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase'
import { TOOL_IMPLEMENTATIONS } from './tools/railway-tools'
import { AgentInput, AgentOutput } from './types'

interface CascadeReport {
  cascadeTrains: Array<{
    id: string
    name: string
    estimatedDelay: number
    reason: 'platform_conflict' | 'crew_crossover' | 'passenger_connection' | 'track_blocking'
    level: 1 | 2
  }>
  passengersAffected: number
  totalCascadeMinutes: number
  timeToImpact: number
  conflictDetails: string[]
  summary: string
}

const CASCADE_SYSTEM_PROMPT = `
You are the Cascade Analyzer for RailMind, India's autonomous railway 
operations intelligence system.

Your job: given a delayed train at a junction, trace the COMPLETE cascade 
of downstream delays it will cause.

FOUR CASCADE MECHANISMS to check:
1. PLATFORM CONFLICT: Is the delayed train occupying a platform that another 
   arriving train needs? Check available platforms vs arriving trains.
2. CREW CROSSOVER: The delayed train's crew must hand off to their next duty.
   A late arrival means the next train they operate is also delayed.
3. PASSENGER CONNECTIONS: Passengers on the delayed train have connections to 
   other services. Missing connections means those trains wait or those 
   passengers are stranded.
4. TRACK BLOCKING: Trains behind the delayed one on the same track section 
   cannot enter the station until the platform clears.

REALISTIC NUMBERS FOR INDIAN RAILWAYS:
- Platform conflict at major junction: typically delays 1-2 trains by 15-30 min
- Crew crossover delay: typically adds 10-20 min to the next train
- Passenger connections: affects 200-400 passengers at major junction
- Track blocking: affects 1-3 trains waiting to enter station
- Total cascade at major junction (like PNBE, NDLS, HWH): 3-5 trains, 
  800-2000 passengers, 40-80 total passenger-minutes

OUTPUT only this JSON after your analysis:
{
  "cascadeTrains": [
    {"id":"TRAIN_ID","name":"TRAIN_NAME","estimatedDelay":MINUTES,
     "reason":"platform_conflict|crew_crossover|passenger_connection|track_blocking",
     "level":1}
  ],
  "passengersAffected": NUMBER,
  "totalCascadeMinutes": NUMBER,
  "timeToImpact": NUMBER,
  "conflictDetails": ["specific detail 1", "specific detail 2"],
  "summary": "2-3 sentences with specific train names and numbers"
}
`

export class CascadeAnalyzerAgent {
  async run(input: AgentInput): Promise<AgentOutput> {
    const supabase = createServerSupabaseClient()
    const startTime = Date.now()

    const { data: logEntry } = await supabase
      .from('agent_logs')
      .insert({
        agent_name: 'CascadeAnalyzer',
        action: 'Tracing cascade impact',
        input: input as any,
        output: null,
        duration_ms: null,
        incident_id: input.incidentId
      })
      .select('id')
      .single()

    try {
      const { data: incident } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', input.incidentId)
        .single()

      if (!incident) throw new Error('Incident not found')

      // Get sentinel analysis from sentinel_analysis or cascade_impact field
      const sentinelData = incident.sentinel_analysis || incident.cascade_impact?.sentinel_analysis
      const trainId = incident.trigger_train_id
      const delayMinutes = incident.delay_minutes
      const affectedStation = sentinelData?.affectedStation || 'NDLS'
      const trainName = sentinelData?.trainName || trainId

      // Define tools
      const tools = {
        get_station_schedule: tool({
          description: 'Get trains at or approaching a station in next N minutes',
          parameters: z.object({
            station_code: z.string(),
            time_window_minutes: z.number()
          }),
          execute: async (params) => 
            await TOOL_IMPLEMENTATIONS.get_station_schedule(params)
        }),
        get_track_occupancy: tool({
          description: 'Get number of trains approaching a station',
          parameters: z.object({ station_code: z.string() }),
          execute: async (params) => 
            await TOOL_IMPLEMENTATIONS.get_track_occupancy(params)
        }),
        get_passenger_count: tool({
          description: 'Get passenger count for a train',
          parameters: z.object({ train_id: z.string() }),
          execute: async (params) => 
            await TOOL_IMPLEMENTATIONS.get_passenger_count(params)
        }),
        get_crew_assignments: tool({
          description: 'Get crew assignment details for a train',
          parameters: z.object({ train_id: z.string() }),
          execute: async (params) => 
            await TOOL_IMPLEMENTATIONS.get_crew_assignments(params)
        }),
        get_available_platforms: tool({
          description: 'Get available platform count at a station',
          parameters: z.object({ station_code: z.string() }),
          execute: async (params) => 
            await TOOL_IMPLEMENTATIONS.get_available_platforms(params)
        }),
      }

      const userPrompt = `
Analyze cascade impact of this delay:

Primary train: ${trainName} (ID: ${trainId})
Delay: ${delayMinutes} minutes
Junction station: ${affectedStation}

Use your tools to:
1. Check station schedule at ${affectedStation} — what other trains arrive in next 60 min?
2. Check track occupancy at ${affectedStation} — how many trains are on approach?
3. Get passenger count for train ${trainId}
4. Check crew assignments for ${trainId}
5. Check available platforms at ${affectedStation}

Then calculate the full cascade impact.
`

      // STEP 1: Tool gathering
      const { steps } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        system: CASCADE_SYSTEM_PROMPT,
        prompt: userPrompt,
        tools,
        maxSteps: 6,
        temperature: 0.2,
      })

      const toolResultsSummary = steps
        .flatMap(step => step.toolResults || [])
        .map(tr => `${tr.toolName}: ${JSON.stringify(tr.result)}`)
        .join('\n')

      // STEP 2: Structured JSON output
      const { text: jsonText } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        system: 'Output ONLY valid JSON. No markdown fences. No explanation.',
        prompt: `Railway data collected:\n${toolResultsSummary}\n\nPrimary delay: ${trainName} at ${affectedStation}, ${delayMinutes} min late.\n\nOutput the cascade impact JSON now. Use actual train names from the station schedule data. The cascadeTrains array should have 2-4 realistic entries based on the data.`,
        temperature: 0.1,
      })

      // Parse JSON
      const cleanJson = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      let report: CascadeReport
      try {
        report = JSON.parse(cleanJson)
      } catch {
        const match = cleanJson.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('No valid JSON in cascade response')
        report = JSON.parse(match[0])
      }

      // Store in incidents.cascade_impact (merge with sentinel data)
      const existingCascadeImpact = incident.cascade_impact || {}
      await supabase
        .from('incidents')
        .update({
          cascade_impact: {
            ...existingCascadeImpact,
            ...report
          }
        })
        .eq('id', input.incidentId)

      const duration = Date.now() - startTime
      const output: AgentOutput = {
        success: true,
        data: { report },
        summary: report.summary || `Cascade: ${report.cascadeTrains?.length} trains, ${report.passengersAffected} passengers affected`
      }

      if (logEntry?.id) {
        await supabase
          .from('agent_logs')
          .update({
            action: `Cascade: ${report.cascadeTrains?.length || 0} trains affected, ${report.passengersAffected || 0} passengers`,
            output: output as any,
            duration_ms: duration
          })
          .eq('id', logEntry.id)
      }

      console.log(`🔗 Cascade: ${report.cascadeTrains?.length} trains | ${report.passengersAffected} passengers | ${report.totalCascadeMinutes} total min`)
      return output

    } catch (error: any) {
      const duration = Date.now() - startTime
      const failOutput: AgentOutput = {
        success: false,
        data: {},
        summary: 'Cascade analysis failed',
        error: error.message
      }
      console.error('❌ CascadeAnalyzer failed:', error.message)
      if (logEntry?.id) {
        await supabase.from('agent_logs').update({
          action: 'CascadeAnalyzer FAILED',
          output: failOutput as any,
          duration_ms: duration
        }).eq('id', logEntry.id)
      }
      return failOutput
    }
  }
}

export const cascadeAnalyzerAgent = new CascadeAnalyzerAgent()
