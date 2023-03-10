// ==============
// configuration:
// ==============

const BASE_URL  = 'https://alexaradio.vercel.app'
const LOG_LEVEL = 0

// =============================
// do NOT edit beyond this line:
// =============================

const Alexa = require('ask-sdk-core')

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

const console_log = (...args) => {
  if (LOG_LEVEL > 0) {
    console.log(...args)
  }
}

const intent_handler = {}

// -----------------------------------------------------------------------------

intent_handler['launch'] = {
  canHandle(handlerInput) {
    const reqType = Alexa.getRequestType(handlerInput.requestEnvelope)
    const reqName = Alexa.getIntentName(handlerInput.requestEnvelope)

    return (
         (reqType === 'LaunchRequest')
      || (reqType === 'PlaybackController.PlayCommandIssued')
    ) || (
         (reqType === 'IntentRequest')
      && (reqName === 'AMAZON.ResumeIntent')
    )
  },
  async handle(handlerInput) {
    const remoteData   = await getRemoteData('?launch=true')
    const track        = remoteData.track
    const outputSpeech = (remoteData.speech)
      ? `${remoteData.speech} ${track.name}`
      : `Now playing ${track.name}`

    const playBehavior         = 'REPLACE_ALL'
    const streamUrl            = track.url
    const token                = `${track.channel}::${track.name}`
    const offsetInMilliseconds = track.offset || 0

    console_log('[launch] track:', track)

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

// -----------------------------------------------------------------------------

intent_handler['search'] = {
  canHandle(handlerInput) {
    const reqType = Alexa.getRequestType(handlerInput.requestEnvelope)
    const reqName = Alexa.getIntentName(handlerInput.requestEnvelope)

    return (
         (reqType === 'IntentRequest')
      && (reqName === 'PlayMediaIntent')
    )
  },
  async handle(handlerInput) {
    const slotValue    = Alexa.getSlotValue(handlerInput.requestEnvelope, 'SEARCH_TERM')
    const remoteData   = await getRemoteData(`?search=${ encodeURIComponent(slotValue) }`)
    const track        = remoteData.track
    const outputSpeech = (remoteData.speech)
      ? `${remoteData.speech} ${track.name}`
      : `Now playing ${track.name}`

    const playBehavior         = 'REPLACE_ALL'
    const streamUrl            = track.url
    const token                = `${track.channel}::${track.name}`
    const offsetInMilliseconds = track.offset || 0

    console_log('[search] query:', slotValue)
    console_log('[search] track:', track)

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

// -----------------------------------------------------------------------------

intent_handler['stop'] = {
  canHandle(handlerInput) {
    const reqType = Alexa.getRequestType(handlerInput.requestEnvelope)
    const reqName = Alexa.getIntentName(handlerInput.requestEnvelope)

    return (
         (reqType === 'PlaybackController.PauseCommandIssued')
      || (reqType === 'AudioPlayer.PlaybackStopped')
    ) || (
         (reqType === 'IntentRequest')
      && (
              (reqName === 'AMAZON.PauseIntent')
           || (reqName === 'AMAZON.StopIntent')
           || (reqName === 'AMAZON.CancelIntent')
         )
    )
  },
  async handle(handlerInput) {
    const token  = handlerInput.requestEnvelope.context.AudioPlayer.token
    const offset = handlerInput.requestEnvelope.context.AudioPlayer.offsetInMilliseconds

    console_log('[stop] token:', token)
    console_log('[stop] offset:', offset, 'ms')

    const remoteData = await getRemoteData(`?stop=${ encodeURIComponent(token) }&offset=${offset}`)

    return handlerInput.responseBuilder
      .speak(remoteData.speech)
      .addAudioPlayerClearQueueDirective('CLEAR_ALL')
      .addAudioPlayerStopDirective()
      .getResponse()
  }
}

// -----------------------------------------------------------------------------

intent_handler['next'] = {
  canHandle(handlerInput) {
    const reqType = Alexa.getRequestType(handlerInput.requestEnvelope)
    const reqName = Alexa.getIntentName(handlerInput.requestEnvelope)

    return (
         (reqType === 'IntentRequest')
      && (reqName === 'AMAZON.NextIntent')
    )
  },
  async handle(handlerInput) {
    const remoteData = await getRemoteData(`?queue=${ encodeURIComponent(handlerInput.requestEnvelope.context.AudioPlayer.token) }`)
    const track      = remoteData.track

    console_log('[next] track:', track)

    if (track.name && track.url) {
      const outputSpeech = (remoteData.speech)
        ? `${remoteData.speech} ${track.name}`
        : `Now playing ${track.name}`

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
    else {
      const outputSpeech = 'End of playlist'

      return handlerInput.responseBuilder
        .speak(outputSpeech)
        .getResponse()
    }
  }
}

// -----------------------------------------------------------------------------

intent_handler['help'] = {
  canHandle(handlerInput) {
    const reqType = Alexa.getRequestType(handlerInput.requestEnvelope)
    const reqName = Alexa.getIntentName(handlerInput.requestEnvelope)

    return (
         (reqType === 'IntentRequest')
      && (reqName === 'AMAZON.HelpIntent')
    )
  },
  handle(handlerInput) {
    const outputSpeech = 'This skill plays the requested station, or chooses a random station in the requested channel. When started without a search term, will resume playback of the most recent station.'

    return handlerInput.responseBuilder
      .speak(outputSpeech)
      .reprompt(outputSpeech)
      .getResponse()
  }
}

// -----------------------------------------------------------------------------

intent_handler['about'] = {
  canHandle(handlerInput) {
    const reqType = Alexa.getRequestType(handlerInput.requestEnvelope)
    const reqName = Alexa.getIntentName(handlerInput.requestEnvelope)

    return (
         (reqType === 'IntentRequest')
      && (reqName === 'AboutIntent')
    )
  },
  handle(handlerInput) {
    const outputSpeech = "This is an Alexa Skill that uses the 'www' JSON API to query URLs for audio streams from custom playlists that are managed through a web interface. Uses the AudioPlayer interface."

    return handlerInput.responseBuilder
      .speak(outputSpeech)
      .reprompt(outputSpeech)
      .getResponse()
  }
}

// -----------------------------------------------------------------------------

intent_handler['AudioPlayer'] = {
  canHandle(handlerInput) {
    const reqType = Alexa.getRequestType(handlerInput.requestEnvelope)
    const reqName = Alexa.getIntentName(handlerInput.requestEnvelope)

    return reqType.startsWith('AudioPlayer.')
  },
  async handle(handlerInput) {
    const reqType = Alexa.getRequestType(handlerInput.requestEnvelope)

    console_log('[AudioPlayer] event:', reqType)

    const audioPlayerEventName = reqType.split('.')[1]

    switch (audioPlayerEventName) {
      case 'PlaybackNearlyFinished':
        {
          const currentToken         = handlerInput.requestEnvelope.request.token
          const remoteData           = await getRemoteData(`?queue=${ encodeURIComponent(currentToken) }`)
          const track                = remoteData.track

          if (track.name && track.url) {
            console_log('[AudioPlayer.PlaybackNearlyFinished] track:', track)

            const token                = `${track.channel}::${track.name}`
            const offsetInMilliseconds = 0

            handlerInput.responseBuilder
              .addAudioPlayerPlayDirective(
                "ENQUEUE",
                track.url,
                token,
                offsetInMilliseconds,
                currentToken
              )
          }
        }
        break
      case 'PlaybackFailed':
        console.log('Playback failed: %j', handlerInput.requestEnvelope.request)
        break
      case 'PlaybackStarted':
      case 'PlaybackFinished':
      case 'PlaybackStopped':
      default:
        break
    }

    return handlerInput.responseBuilder.getResponse()
  }
}

// -----------------------------------------------------------------------------

intent_handler['end-session'] = {
  canHandle(handlerInput) {
    const reqType = Alexa.getRequestType(handlerInput.requestEnvelope)
    const reqName = Alexa.getIntentName(handlerInput.requestEnvelope)

    return (reqType === 'SessionEndedRequest')
  },
  handle(handlerInput) {
    console_log('Session ended:', handlerInput.requestEnvelope.request.reason)

    return handlerInput.responseBuilder
      .getResponse()
  }
}

// -----------------------------------------------------------------------------

intent_handler['system-exception'] = {
  canHandle(handlerInput) {
    const reqType = Alexa.getRequestType(handlerInput.requestEnvelope)
    const reqName = Alexa.getIntentName(handlerInput.requestEnvelope)

    return (reqType === 'System.ExceptionEncountered')
  },
  handle(handlerInput) {
    console_log('System exception: %j', handlerInput.requestEnvelope.request)
  }
}

// -----------------------------------------------------------------------------

intent_handler['unsupported'] = {
  canHandle(handlerInput) {
    const reqType = Alexa.getRequestType(handlerInput.requestEnvelope)
    const reqName = Alexa.getIntentName(handlerInput.requestEnvelope)

    return (
         (reqType === 'IntentRequest')
      && (
             (reqName === 'AMAZON.LoopOffIntent')
          || (reqName === 'AMAZON.LoopOnIntent')
          || (reqName === 'AMAZON.PreviousIntent')
          || (reqName === 'AMAZON.RepeatIntent')
          || (reqName === 'AMAZON.ShuffleOffIntent')
          || (reqName === 'AMAZON.ShuffleOnIntent')
          || (reqName === 'AMAZON.StartOverIntent')
        )
    )
  },
  handle(handlerInput) {
    const outputSpeech = "Sorry, I can't yet perform that action"

    return handlerInput.responseBuilder
      .speak(outputSpeech)
      .getResponse()
  }
}

// -----------------------------------------------------------------------------

const ErrorHandler = {
  canHandle() {
    return true
  },
  handle(handlerInput, error) {
    console.log('Error handled: %j', error)
    console_log('Failed request: %j', handlerInput.requestEnvelope.request)

    const outputSpeech = 'Sorry, I had trouble doing what you asked. Please try again.'

    return handlerInput.responseBuilder
      .speak(outputSpeech)
      .reprompt(outputSpeech)
      .getResponse()
  }
}

// -----------------------------------------------------------------------------

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    intent_handler['launch'],
    intent_handler['search'],
    intent_handler['stop'],
    intent_handler['next'],
    intent_handler['help'],
    intent_handler['about'],
    intent_handler['AudioPlayer'],
    intent_handler['end-session'],
    intent_handler['system-exception'],
    intent_handler['unsupported']
  )
  .addErrorHandlers(ErrorHandler)
  .lambda()
