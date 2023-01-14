import {
  BasicAudioPlayer,
  IMessageViewer,
  LinearTimingSource,
  OpenSheetMusicDisplay as OSMD,
  PlaybackManager,
  PlaybackState,
  MidiInstrument,
} from 'opensheetmusicdisplay'

const init = () => {
  console.log('init')

  // Loading the sound source takes the most time, so do it first.
  // The audio context is now in suspend state.
  // Call resume() when the user clicks the play button.
  const context = new AudioContext()
  context.suspend().then(_ => {})

  const basicAudioPlayer: Promise<BasicAudioPlayer> = (() => {
    const basicAudioPlayer = new BasicAudioPlayer()
    return Promise.all([
      basicAudioPlayer.loadSoundFont(MidiInstrument.String_Ensemble_1),
      basicAudioPlayer.loadSoundFont(MidiInstrument.Acoustic_Grand_Piano),
      basicAudioPlayer.loadSoundFont(MidiInstrument.Church_Organ),
      basicAudioPlayer.loadSoundFont(MidiInstrument.Choir_Aahs),
      basicAudioPlayer.loadSoundFont(MidiInstrument.Pad_1_new_age)
    ]).then(() => basicAudioPlayer)
  })()

  const getElementByIdOrError = (elementId: string) => {
    const element = document.getElementById(elementId)
    if (!element) {throw Error(`elementId: ${elementId} not found`)}
    return element
  }

  const osmdRenderAreaDiv = getElementByIdOrError('osmd-render-area') as HTMLDivElement
  const fileSelector = getElementByIdOrError('file-selector') as HTMLSelectElement
  const instrumentSelector = getElementByIdOrError('instrument-selector') as HTMLSelectElement
  const playStopButton = document.getElementById('play-stop') as HTMLButtonElement

  const options = {
    autoResize: true,
    drawTitle: false,
    drawPartNames: false,
  }
  const osmd: OSMD = new OSMD(osmdRenderAreaDiv, options)

  const currentSelectedInstrument = () => {
    const instrValue = instrumentSelector.options[instrumentSelector.selectedIndex].value
    if (instrValue === 'String_Ensemble_1') {
      return MidiInstrument.String_Ensemble_1
    } else if (instrValue === 'Acoustic_Grand_Piano') {
      return MidiInstrument.Acoustic_Grand_Piano
    } else if (instrValue === 'Church_Organ') {
      return MidiInstrument.Church_Organ
    } else if (instrValue === 'Choir_Aahs') {
      return MidiInstrument.Choir_Aahs
    } else if (instrValue === 'Pad_1_new_age') {
      return MidiInstrument.Pad_1_new_age
    } else {
      throw Error('unknown instrument!')
    }
  }

  const buttonDisabledOnLoading = <T> (promise: Promise<T>) => {
    playStopButton.disabled = true
    return promise.then(p => {
      playStopButton.disabled = false
      return p
    })
  }

  const loadCurrentSelectFile = () => {
    const filename = fileSelector.options[fileSelector.selectedIndex].value
    return osmd.load(filename).then(() => {
      console.log(`${filename} loaded.`)
      osmd.render()
      return setSheetPlaybackContent()
    })
  }
  fileSelector.addEventListener('change', () => buttonDisabledOnLoading(loadCurrentSelectFile()))
  buttonDisabledOnLoading(loadCurrentSelectFile()).then(() => {})

  const setSheetPlaybackContent = () => {
    return basicAudioPlayer.then(bap => {
      const timingSource = new LinearTimingSource()
      const messageViewer: IMessageViewer = {
        MessageOccurred: (tpe: any, mes: any) => {console.log(`message: tpe: ${tpe}, mes: ${mes}`)}
      }

      const playbackManager = new PlaybackManager(timingSource, undefined as any, bap, messageViewer)
      playbackManager.DoPlayback = true
      playbackManager.DoPreCount = false
      playbackManager.PreCountMeasures = 1

      timingSource.Settings = osmd.Sheet.SheetPlaybackSetting

      const currentInstrument = currentSelectedInstrument()
      // I want to use the specified sound source instead of using the sound source described in MusicXML.
      // So overwrite the contents of the sheet
      for (const instr of osmd.Sheet.Instruments) {
        instr.MidiInstrumentId = currentInstrument
      }

      playbackManager.initialize(osmd.Sheet.MusicPartManager)
      playbackManager.addListener(osmd.cursor)
      osmd.PlaybackManager = playbackManager

      console.log('setSheetPlaybackContent done')
      return
    })
  }

  instrumentSelector.addEventListener('change', () => buttonDisabledOnLoading(setSheetPlaybackContent()))

  const playStop: () => Promise<void> = () => {
    if (!osmd.PlaybackManager) {
      alert('audio preparing..')
      return Promise.reject('audio preparing..')
    } else {
      return context.resume().then(() => {
        if (osmd.PlaybackManager.RunningState == PlaybackState.Stopped) {
          console.log('play')
          return osmd.PlaybackManager.play().then(() => {})
        } else {
          console.log('stop')
          return osmd.PlaybackManager.pause().then(() => osmd.PlaybackManager.reset())
        }
      })
    }
  }

  const clickEventType = ((window.ontouchstart !== null) ? 'click' : 'touchend');
  playStopButton.addEventListener(clickEventType, playStop)

}

init()
