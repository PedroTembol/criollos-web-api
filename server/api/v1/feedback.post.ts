import { defineEventHandler, readBody } from 'h3'
import { getAppConfig } from '../../utils/config'
import { postUpstreamJson } from '../../utils/upstream'

type FeedbackBody = {
  message?: string
  msg?: string
  rating?: number
  source?: string
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as FeedbackBody
  const config = getAppConfig()
  const message = body.message || body.msg

  if (!message || !message.trim()) {
    return {
      ok: false,
      error: {
        code: 'INVALID_MESSAGE',
        message: 'message is required'
      }
    }
  }

  const payload = {
    IDCLIENT: config.idClient,
    msg: message.trim(),
    rating: body.rating ?? null,
    source: body.source ?? null
  }

  await postUpstreamJson('SendFeedback', payload)

  return {
    ok: true
  }
})
