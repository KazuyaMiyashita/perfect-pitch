import {
  BasicAudioPlayer,
  IMessageViewer,
  LinearTimingSource,
  OpenSheetMusicDisplay as OSMD,
  PlaybackManager,
  PlaybackState,
  MidiInstrument, TransposeCalculator,
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
  const osmdRenderAreaAboveDiv = getElementByIdOrError('osmd-render-area-above') as HTMLDivElement
  const taskSelector = getElementByIdOrError('task-selector') as HTMLSelectElement
  const staffSelector = getElementByIdOrError('staff-selector') as HTMLSelectElement
  const instrumentSelector = getElementByIdOrError('instrument-selector') as HTMLSelectElement
  const transposeInput = getElementByIdOrError('transpose-input') as HTMLButtonElement
  const playStopButton = document.getElementById('play-stop') as HTMLButtonElement
  const showHideButton = document.getElementById('show-hide') as HTMLButtonElement
  const transposeButton = getElementByIdOrError('transpose-button') as HTMLButtonElement
  const nextButton = document.getElementById('next') as HTMLButtonElement


  const options = {
    autoResize: true,
    drawTitle: false,
    drawPartNames: false,
  }
  const osmd: OSMD = new OSMD(osmdRenderAreaDiv, options)
  osmd.TransposeCalculator = new TransposeCalculator()

  const getFileName = (task: string, staff: string) => {
    return `${task}-${staff}.musicxml`
  }

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

  const buttonDisabledOnLoading = <T>(promise: Promise<T>) => {
    playStopButton.disabled = true
    return promise.then(p => {
      playStopButton.disabled = false
      return p
    })
  }


  const loadCurrentSelectFile = () => {
    const task = taskSelector.options[taskSelector.selectedIndex].value
    const staff = staffSelector.options[staffSelector.selectedIndex].value
    const filename = getFileName(task, staff)
    return osmd.load(filename).then(() => {
      console.log(`${filename} loaded.`)

      const value = parseInt(transposeInput.value)
      osmd.Sheet.Transpose = value
      osmd.updateGraphic()

      osmd.render()
      return setSheetPlaybackContent()
    })
  }
  taskSelector.addEventListener('change', () => buttonDisabledOnLoading(loadCurrentSelectFile()))
  staffSelector.addEventListener('change', () => buttonDisabledOnLoading(loadCurrentSelectFile()))

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
    }
    if (context.state === "suspended") {
      context.resume();
    }

    if (osmd.PlaybackManager.RunningState == PlaybackState.Stopped) {
      console.log('play')
      return osmd.PlaybackManager.play().then(() => {})
    } else {
      console.log('stop')
      return osmd.PlaybackManager.pause().then(() => osmd.PlaybackManager.reset())
    }
  }


  const clickEventType = ((window.ontouchstart !== null) ? 'click' : 'touchend');
  playStopButton.addEventListener(clickEventType, playStop)

  const next = () => {
    transposeInput.value = (Math.floor(Math.random() * (6 - (-5) + 1) + (-5))).toString()
    taskSelector.selectedIndex = Math.floor(Math.random() * taskSelector.options.length)
    osmdRenderAreaAboveDiv.classList.add("hide-osmd")
    return buttonDisabledOnLoading(loadCurrentSelectFile()).then(() => {})
  }
  transposeInput.value = (Math.floor(Math.random() * (6 - (-5) + 1) + (-5))).toString()
  taskSelector.selectedIndex = Math.floor(Math.random() * taskSelector.options.length)
  nextButton.addEventListener(clickEventType, next)


  const switchShowHide = () => {
    if (osmdRenderAreaAboveDiv.classList.contains("hide-osmd")) {
      osmdRenderAreaAboveDiv.classList.remove("hide-osmd")
    } else {
      osmdRenderAreaAboveDiv.classList.add("hide-osmd")
    }
  }
  showHideButton.addEventListener(clickEventType, switchShowHide)

  const transpose = (num: number) => {
    const value = Math.floor(num)
    transposeInput.value = num.toString()
    osmd.Sheet.Transpose = value
    osmd.updateGraphic()

    osmd.render()
    return setSheetPlaybackContent()
  }

  const transposeRandom = () => {
    return transpose((Math.floor(Math.random() * (6 - (-5) + 1) + (-5))))
  }

  const transposeUp = () => {
    return transpose(parseInt(transposeInput.value) + 1)
  }
  const transposeDown = () => {
    return transpose(parseInt(transposeInput.value) - 1)
  }

  transposeButton.addEventListener(clickEventType, transposeRandom)

  const keyup = (e: KeyboardEvent) => {
    if (e.code == 'Space') {
      playStop().then(() => {})
    } else if (e.code == 'Enter') {
      switchShowHide()
    } else if (e.code == 'ArrowRight') {
      next().then(() => {})
    } else if (e.code == 'ArrowUp') {
      transposeUp().then(() => {})
    } else if (e.code == 'ArrowDown') {
      transposeDown().then(() => {})
    } else if (e.code == 'KeyT') {
      transposeRandom().then(() => {})
    }


    return false
  }

  document.addEventListener('keyup', keyup)

}

init()
