/* eslint-disable no-mixed-operators */
/* eslint-disable  func-names */
/* eslint-disable  no-console */

// ==============
// configuration:
// ==============

const BASE_URL  = "https://alexaradio.vercel.app"
const LOG_LEVEL = 0

// =============================
// do NOT edit beyond this line:
// =============================

const Alexa = require('ask-sdk-core')

const console_log = (...args) => {
  if (LOG_LEVEL > 0) {
    console.log(...args)
  }
}

const PlayMediaIntentHandler = {
  canHandle(handlerInput) {
    return (
           (handlerInput.requestEnvelope.request.type === 'LaunchRequest')
        || (handlerInput.requestEnvelope.request.type === 'IntentRequest')
      ) && (
           (handlerInput.requestEnvelope.request.intent.name === 'PlayMediaIntent')
        || (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.ResumeIntent')
        || (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.LoopOnIntent')
        || (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.PreviousIntent')
        || (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.RepeatIntent')
        || (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.ShuffleOnIntent')
        || (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StartOverIntent')
      )
  },
  async handle(handlerInput) {
    const slotValue    = Alexa.getSlotValue(handlerInput.requestEnvelope, 'SEARCH_TERM')
    const remoteData   = await getRemoteData("?search="+slotValue)
    const track        = remoteData.track
    const outputSpeech = (remoteData.speech)
      ? `${remoteData.speech} ${track.name}`
      : `Now playing ${track.name}`

    const playBehavior         = 'REPLACE_ALL'
    const streamUrl            = track.url
    const token                = `${track.channel}::${track.name}`
    const offsetInMilliseconds = track.offset || 0

    console_log('[PlayMediaIntentHandler] track:', track)

    return handlerInput.responseBuilder
      .speak(outputSpeech)
      .addAudioPlayerPlayDirective(
        playBehavior,
        streamUrl,
        token,
        offsetInMilliseconds
      )
      .getResponse()
  },
}

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
           (handlerInput.requestEnvelope.request.type === 'IntentRequest')
        && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent')
      )
  },
  handle(handlerInput) {
    const speechText = 'This skill plays an audio stream when it is started. It does not have any additional functionality.'

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse()
  },
}

const AboutIntentHandler = {
  canHandle(handlerInput) {
    return (
           (handlerInput.requestEnvelope.request.type === 'IntentRequest')
        && (handlerInput.requestEnvelope.request.intent.name === 'AboutIntent')
      )
  },
  handle(handlerInput) {
    const speechText = "This is an Alexa Skill that uses the 'www' JSON API to query URLs for audio streams from custom playlists that are managed through a web interface. Uses the AudioPlayer interface."

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse()
  },
}

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
           (handlerInput.requestEnvelope.request.type === 'IntentRequest')
      ) && (
           (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent')
        || (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.PauseIntent')
        || (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent')
        || (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.LoopOffIntent')
        || (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.ShuffleOffIntent')
      )
  },
  async handle(handlerInput) {
    const token  = handlerInput.requestEnvelope.context.AudioPlayer.token
    const offset = handlerInput.requestEnvelope.context.AudioPlayer.offsetInMilliseconds

    console_log("token", token, offset, handlerInput.requestEnvelope)

    const remoteData = await getRemoteData(`?stop=${token}&offset=${offset}`)

    return handlerInput.responseBuilder
      .speak(remoteData.speech)
      .addAudioPlayerClearQueueDirective('CLEAR_ALL')
      .addAudioPlayerStopDirective()
      .getResponse()
  },
}

const PlaybackStoppedIntentHandler = {
  canHandle(handlerInput) {
    return (
           (handlerInput.requestEnvelope.request.type === 'PlaybackController.PauseCommandIssued')
        || (handlerInput.requestEnvelope.request.type === 'AudioPlayer.PlaybackStopped')
      )
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .addAudioPlayerClearQueueDirective('CLEAR_ALL')
      .addAudioPlayerStopDirective()
      .getResponse()
  },
}

const NextIntentHandler = {
  canHandle(handlerInput) {
    return (
           (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest')
        && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NextIntent')
      )
  },
  async handle(handlerInput) {
    const remoteData   = await getRemoteData("?queue="+handlerInput.requestEnvelope.context.AudioPlayer.token)
    const track        = remoteData.track
    const outputSpeech = (remoteData.speech)
      ? `${remoteData.speech} ${track.name}`
      : `Now playing ${track.name}`

    console_log('[NextIntentHandler] track:', track)

    const playBehavior         = 'REPLACE_ALL'
    const streamUrl            = track.url
    const token                = `${track.channel}::${track.station}`
    const offsetInMilliseconds = track.offset || 0

    return handlerInput.responseBuilder
      .speak(outputSpeech)
      .addAudioPlayerPlayDirective(
        playBehavior,
        streamUrl,
        token,
        offsetInMilliseconds
      )
      .getResponse()
  }
}

const AudioPlayerEventHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type.startsWith('AudioPlayer.')
  },
  async handle(handlerInput) {
    console_log(`AudioPlayer event encountered: ${handlerInput.requestEnvelope.request.type}`)

    const audioPlayerEventName = handlerInput.requestEnvelope.request.type.split('.')[1]

    switch (audioPlayerEventName) {
      case 'PlaybackNearlyFinished':
        {
          const expectedPreviousToken = handlerInput.requestEnvelope.request.token
          const remoteData            = await getRemoteData("?queue="+expectedPreviousToken)
          const track                 = remoteData.track
          const token                 = `${track.channel}::${track.name}`
          const offsetInMilliseconds  = 0

          console_log('[PlaybackNearlyFinished] track:', track)

          handlerInput.responseBuilder
            .addAudioPlayerPlayDirective(
              "ENQUEUE",
              track.url,
              token,
              offsetInMilliseconds,
              expectedPreviousToken
            )
        }
        break
      case 'PlaybackFailed':
        console.log('Playback Failed : %j', handlerInput.requestEnvelope.request)
        break
      case 'PlaybackStarted':
      case 'PlaybackFinished':
      case 'PlaybackStopped':
      default:
        break
    }

    return handlerInput.responseBuilder.getResponse()
  },
}

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return (handlerInput.requestEnvelope.request.type === 'SessionEndedRequest')
  },
  handle(handlerInput) {
    console_log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`)

    return handlerInput.responseBuilder
      .getResponse()
  },
}

const ExceptionEncounteredRequestHandler = {
  canHandle(handlerInput) {
    return (handlerInput.requestEnvelope.request.type === 'System.ExceptionEncountered')
  },
  handle(handlerInput) {
    console_log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`)

    return true
  },
}

const ErrorHandler = {
  canHandle() {
    return true
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error}`)
    console_log(handlerInput.requestEnvelope)

    return handlerInput.responseBuilder
      .getResponse()
  },
}

const getRemoteData = (val) => new Promise((resolve, reject) => {
  const url     = BASE_URL + '/api/radio' + val
  const client  = url.startsWith('https') ? require('https') : require('http')
  const request = client.get(url, (response) => {
    if (response.statusCode < 200 || response.statusCode > 299) {
      reject(new Error(`Failed with status code: ${response.statusCode}`))
    }
    const body = []
    response.on('data', (chunk) => body.push(chunk))
    response.on('end', () => {
      const res = body.join('')
      resolve(JSON.parse(res))
    })
  })
  request.on('error', (err) => reject(err))
})

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    PlayMediaIntentHandler,
    NextIntentHandler,
    AudioPlayerEventHandler,
    CancelAndStopIntentHandler,
    PlaybackStoppedIntentHandler,
    AboutIntentHandler,
    HelpIntentHandler,
    ExceptionEncounteredRequestHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda()
