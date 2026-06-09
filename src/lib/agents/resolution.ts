import { generateText } from 'ai'
import { groq } from '@ai-sdk/groq'
import { createServerSupabaseClient } from '@/lib/supabase'
import { AgentInput, AgentOutput } from './types'

interface ResolutionOption {
  title: string
  description: string
  immediateActions: string[]  // exactly 3-5 items, each starting with [HH:MM]
  estimatedDelayReduction: number
  tradeoffs: string
  difficulty: 'easy' | 'medium' | 'hard'
}

const RESOLUTION_SYSTEM_PROMPT = `
You are the Resolution Agent for RailMind, India's autonomous railway 
operations intelligence system.

Generate EXACTLY 3 resolution options for a cascade delay incident.
Each option must be immediately actionable by a single station master.

OPTION STRUCTURE RULES:
- Option 1: Maximum effectiveness — most aggressive, highest delay reduction
- Option 2: Balanced — moderate intervention, practical  
- Option 3: Minimal — easiest to implement, lower reduction

FOR EACH OPTION you MUST specify:
- EXACT platform numbers (e.g. "Move Train 12303 from Platform 3 to Platform 5")
- EXACT hold durations (e.g. "Hold departure of 12567 by 8 minutes")
- EXACT passenger reroute (e.g. "Reroute 200 passengers to Train 12381 departing Platform 2")
- Realistic delay reduction in minutes (total across all affected trains)

IMMEDIATEACTIONS FORMAT — exactly 3-5 items, each must start with [HH:MM]:
Use current time + realistic offsets for the timestamps.

REALISTIC DELAY REDUCTIONS for Indian Railways:
- Platform reassignment: saves 8-15 min per affected train
- Crew crossover adjustment: saves 10-20 min
- Passenger rerouting: saves 0 min on schedule but helps passengers
- Total realistic savings: 25-60 min across cascade

OUTPUT — respond with ONLY this JSON array, no other text:
[
  {
    "title": "string",
    "description": "string",
    "immediateActions": ["[14:32] specific action 1", "[14:35] specific action 2", "[14:40] specific action 3"],
    "estimatedDelayReduction": NUMBER,
    "tradeoffs": "string describing what this option sacrifices",
    "difficulty": "easy|medium|hard"
  },
  { second option },
  { third option }
]
`

export class ResolutionAgent {
  async run(input: AgentInput): Promise<AgentOutput> {
    const supabase = createServerSupabaseClient()
    const startTime = Date.now()

    const { data: logEntry } = await supabase
      .from('agent_logs')
      .insert({
        agent_name: 'Resolution',
        action: 'Generating resolution options',
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

      const cascadeData = incident.cascade_impact || {}
      const sentinelData = incident.sentinel_analysis || cascadeData.sentinel_analysis || {}
      const cascadeTrains = cascadeData.cascadeTrains || []
      const trainId = incident.trigger_train_id
      const delayMinutes = incident.delay_minutes
      const affectedStation = sentinelData.affectedStation || cascadeData.affectedStation || 'Unknown'
      const trainName = sentinelData.trainName || cascadeData.trainName || trainId
      const passengersAffected = cascadeData.passengersAffected || 0
      const now = new Date()
      const timeStr = now.toTimeString().slice(0,5)

      const userPrompt = `
Generate 3 resolution options for this cascade incident:

PRIMARY DELAY:
- Train: ${trainName} (${trainId})
- Delay: ${delayMinutes} minutes
- Station: ${affectedStation}
- Current time: ${timeStr}

CASCADE IMPACT:
- Affected trains: ${JSON.stringify(cascadeTrains.slice(0, 4))}
- Total passengers affected: ${passengersAffected}
- Conflict details: ${JSON.stringify(cascadeData.conflictDetails || [])}

Generate 3 specific, actionable resolution options. Use platform numbers 
1-${Math.floor(Math.random() * 4) + 4} for ${affectedStation}.
Reference the actual train names and numbers above.
Output only the JSON array.
`

      // Single step — no tools needed, reason from existing data
      const { text } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        system: RESOLUTION_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.3,
      })

      const cleanText = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()
      
      let options: ResolutionOption[]
      try {
        options = JSON.parse(cleanText)
      } catch {
        const match = cleanText.match(/\[[\s\S]*\]/)
        if (!match) throw new Error('Resolution did not return valid JSON array')
        options = JSON.parse(match[0])
      }

      // Ensure exactly 3 options
      if (!Array.isArray(options) || options.length < 1) {
        throw new Error('Resolution returned invalid options array')
      }
      options = options.slice(0, 3)

      // Sort by estimatedDelayReduction descending
      options.sort((a, b) => (b.estimatedDelayReduction || 0) - (a.estimatedDelayReduction || 0))

      // Store in incidents
      await supabase
        .from('incidents')
        .update({ resolution_options: options as any })
        .eq('id', input.incidentId)

      const duration = Date.now() - startTime
      const output: AgentOutput = {
        success: true,
        data: { options },
        summary: `${options.length} resolution options generated. Best saves ${options[0]?.estimatedDelayReduction || 0} min.`
      }

      if (logEntry?.id) {
        await supabase.from('agent_logs').update({
          action: `Resolution: ${options.length} options, best saves ${options[0]?.estimatedDelayReduction || 0} min delay`,
          output: output as any,
          duration_ms: duration
        }).eq('id', logEntry.id)
      }

      console.log(`⚡ Resolution: ${options.length} options | Best reduction: ${options[0]?.estimatedDelayReduction} min`)
      return output

    } catch (error: any) {
      const duration = Date.now() - startTime
      const failOutput: AgentOutput = {
        success: false,
        data: {},
        summary: 'Resolution generation failed',
        error: error.message
      }
      console.error('❌ Resolution Agent failed:', error.message)
      if (logEntry?.id) {
        await supabase.from('agent_logs').update({
          action: 'Resolution FAILED',
          output: failOutput as any,
          duration_ms: duration
        }).eq('id', logEntry.id)
      }
      return failOutput
    }
  }
}

export const resolutionAgent = new ResolutionAgent()
