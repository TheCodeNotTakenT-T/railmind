import { generateText } from 'ai'
import { groq } from '@ai-sdk/groq'
import { createServerSupabaseClient } from '@/lib/supabase'
import { AgentInput, AgentOutput } from './types'

interface GeneratedNotifications {
  passengerSMS: string        // HARD LIMIT: max 160 characters
  stationMasterBrief: string[] // EXACTLY 5 items, each starts with [HH:MM]
  crewAlert: string           // 2-3 sentences max
}

const COMMUNICATION_SYSTEM_PROMPT = `
You are the Communication Agent for RailMind, India's autonomous railway
operations intelligence system.

Draft notifications for THREE audiences. Every message must reference
SPECIFIC train numbers, platform numbers, and times. No generic text.

AUDIENCE 1 — PASSENGER SMS:
- ABSOLUTE MAXIMUM: 160 characters (count carefully)
- Simple English only, zero jargon
- Tell passengers WHAT changed and WHAT to do
- Never use: "inconvenience", "apologize", "unfortunately", "please be informed"
- Good example: "Train 12301 delayed 25min. Platform 5 at 14:45. Connection to 12381 rescheduled 15:10."
- Bad example: "We regret to inform passengers that train services are delayed."

AUDIENCE 2 — STATION MASTER BRIEF:
- EXACTLY 5 bullet points, no more, no less
- Each starts with [HH:MM] format
- Each is one specific, concrete action in imperative tone
- Good example: "[14:28] Move Train 12303 from Platform 3 to Platform 5 immediately."
- Bad example: "[14:28] Consider adjusting platform assignments as needed."

AUDIENCE 3 — CREW ALERT:
- 2 sentences maximum
- Include: train number, new arrival time, platform, handoff details
- Professional, factual, no pleasantries
- Good example: "Train 12301 arriving Platform 5 at 14:45 (25 min late). Crew handoff for 12302 delayed to 15:00 — report Platform 5 dispatch office."

OUTPUT — ONLY this JSON, nothing else:
{
  "passengerSMS": "string under 160 chars",
  "stationMasterBrief": ["[HH:MM] action 1","[HH:MM] action 2","[HH:MM] action 3","[HH:MM] action 4","[HH:MM] action 5"],
  "crewAlert": "string"
}
`

export class CommunicationAgent {
  async run(input: AgentInput): Promise<AgentOutput> {
    const supabase = createServerSupabaseClient()
    const startTime = Date.now()

    const { data: logEntry } = await supabase
      .from('agent_logs')
      .insert({
        agent_name: 'Communication',
        action: 'Drafting notifications',
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
      const sentinel = cascadeData.sentinel_analysis ||
                       (incident as any).sentinel_analysis || {}
      const resolutionOptions = incident.resolution_options || []
      const bestResolution = resolutionOptions[0] || null

      const trainId = incident.trigger_train_id
      const delayMinutes = incident.delay_minutes
      const station = sentinel.affectedStation || 'junction'
      const trainName = sentinel.trainName || trainId
      const passengers = cascadeData.passengersAffected || 500
      const cascadeCount = cascadeData.cascadeTrains?.length ||
                           sentinel.estimatedCascadeTrains || 3

      const now = new Date()
      const currentTime = now.toTimeString().slice(0,5)
      const arrivalTime = new Date(now.getTime() + delayMinutes * 60000)
        .toTimeString().slice(0,5)

      const userPrompt = `
Draft notifications for this railway incident:

INCIDENT:
- Train: ${trainName} (${trainId})
- Delay: ${delayMinutes} minutes
- Station: ${station}
- Current time: ${currentTime}
- New expected arrival: ${arrivalTime}
- Passengers directly affected: ${passengers}
- Cascade trains affected: ${cascadeCount}

RESOLUTION BEING APPLIED (Option 1):
${bestResolution ? JSON.stringify(bestResolution.immediateActions) : 'Platform reassignment in progress'}

CONSTRAINT: passengerSMS must be 160 characters or less. Count every character.
Output only the JSON object.
`

      const { text } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        system: COMMUNICATION_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.2,
      })

      const cleanText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      let notifications: GeneratedNotifications
      try {
        notifications = JSON.parse(cleanText)
      } catch {
        const match = cleanText.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('Communication did not return valid JSON')
        notifications = JSON.parse(match[0])
      }

      // Enforce SMS 160 char limit
      if (notifications.passengerSMS?.length > 160) {
        notifications.passengerSMS = notifications.passengerSMS.slice(0, 157) + '...'
      }

      // Enforce exactly 5 station master bullets
      if (notifications.stationMasterBrief?.length > 5) {
        notifications.stationMasterBrief = notifications.stationMasterBrief.slice(0, 5)
      }
      while ((notifications.stationMasterBrief?.length || 0) < 5) {
        notifications.stationMasterBrief = notifications.stationMasterBrief || []
        notifications.stationMasterBrief.push(
          `[${currentTime}] Monitor situation and adjust platform assignments as needed`
        )
      }

      // Store notifications in incidents table
      await supabase
        .from('incidents')
        .update({ notifications: notifications as any })
        .eq('id', input.incidentId)

      // Also insert into notifications table (3 rows)
      await supabase.from('notifications').insert([
        {
          incident_id: input.incidentId,
          recipient_type: 'passenger',
          channel: 'sms',
          content: notifications.passengerSMS
        },
        {
          incident_id: input.incidentId,
          recipient_type: 'stationmaster',
          channel: 'brief',
          content: notifications.stationMasterBrief.join('\n')
        },
        {
          incident_id: input.incidentId,
          recipient_type: 'crew',
          channel: 'alert',
          content: notifications.crewAlert
        }
      ])

      const duration = Date.now() - startTime
      const output: AgentOutput = {
        success: true,
        data: { notifications },
        summary: `Notifications drafted. SMS: ${notifications.passengerSMS?.length} chars. Brief: 5 actions. Crew alert ready.`
      }

      if (logEntry?.id) {
        await supabase.from('agent_logs').update({
          action: `Communication: SMS(${notifications.passengerSMS?.length}chr), Brief(5 actions), Crew alert`,
          output: output as any,
          duration_ms: duration
        }).eq('id', logEntry.id)
      }

      console.log(`📡 Communication: SMS(${notifications.passengerSMS?.length} chars) | Brief(5 actions) | Crew alert done`)
      return output

    } catch (error: any) {
      const duration = Date.now() - startTime
      const failOutput: AgentOutput = {
        success: false,
        data: {},
        summary: 'Communication agent failed',
        error: error.message
      }
      console.error('❌ Communication Agent failed:', error.message)
      if (logEntry?.id) {
        await supabase.from('agent_logs').update({
          action: 'Communication FAILED',
          output: failOutput as any,
          duration_ms: duration
        }).eq('id', logEntry.id)
      }
      return failOutput
    }
  }
}

export const communicationAgent = new CommunicationAgent()
