import {OpenSheetMusicDisplay as OSMD} from 'opensheetmusicdisplay'
import MidiPlayer from 'midi-player-js';
import Soundfont, {InstrumentName} from "soundfont-player";
import {transposeMusicXML} from './transpose'

const init = () => {
  console.log('init')

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
  const playButton = document.getElementById('play') as HTMLButtonElement
  const stopButton = document.getElementById('stop') as HTMLButtonElement
  const showHideButton = document.getElementById('show-hide') as HTMLButtonElement
  const transposeDownButton = getElementByIdOrError('transpose-down') as HTMLButtonElement
  const transposeRandomButton = getElementByIdOrError('transpose-random') as HTMLButtonElement
  const transposeUpButton = getElementByIdOrError('transpose-up') as HTMLButtonElement
  const nextButton = document.getElementById('next') as HTMLButtonElement
  const autoHideCheckbox = document.getElementById('auto-hide') as HTMLInputElement
  const autoPlayCheckbox = document.getElementById('auto-play') as HTMLInputElement


  const getSheetFileName = (task: string, staff: string) => {
    return `./sheets/${task}-${staff}.musicxml`
  }
  const getMidiFileName = (task: String) => {
    return `./sheets/${task}.mid`
  }
  const tasks = Array.from(taskSelector.options).map(o => o.value)
  const sheetFileNames = [
    tasks.map(task => getSheetFileName(task, 'grand-staff')),
    tasks.map(task => getSheetFileName(task, 'four-staves')),
  ].flat();
  const sheetDocumentsPromise: Promise<Map<string, Document>> = (() => {
    const domParser = new DOMParser()
    return Promise.all(sheetFileNames.map(sheet => {
      return fetch(sheet).then(res => res.text()).then(data => domParser.parseFromString(data, 'text/xml'))
    })).then(all => {
      const map: Map<string, Document> = new Map()
      sheetFileNames.forEach((e, i) => map.set(e, all[i]))
      return map
    })
  })()
  const midiFileNames = tasks.map(getMidiFileName)

  // taskName -> array buffer of midi file
  var midiFiles: Map<string, ArrayBuffer> | null = null;

  (() => {
    console.log("midi files loading.")
    Promise.all(midiFileNames.map(midiFileName => {
      return fetch(midiFileName).then(res => res.arrayBuffer())
    })).then(all => {
      const map: Map<string, ArrayBuffer> = new Map()
      tasks.forEach((e, i) => map.set(e, all[i]))
      midiFiles = map
      console.log("midi files loaded.")
    })
  })()

  const options = {
    autoResize: true,
    drawTitle: false,
    drawPartNames: false,
  }
  const osmd: OSMD = new OSMD(osmdRenderAreaDiv, options)


  const buttonDisabledOnLoading = <T>(promise: Promise<T>) => {
    playButton.disabled = true
    return promise.then(p => {
      playButton.disabled = false
      return p
    })
  }


  const loadCurrentSelectFile = () => {
    const task = taskSelector.options[taskSelector.selectedIndex].value
    const staff = staffSelector.options[staffSelector.selectedIndex].value
    const filename = getSheetFileName(task, staff)
    return sheetDocumentsPromise.then(sheetDocuments => {
      const doc: Document = sheetDocuments.get(filename)!
      const transposed = transposeMusicXML(doc, parseInt(transposeInput.value), (staff === 'four-staves'))
      return osmd.load(transposed).then(() => {
        console.log(`${filename} loaded.`)
        osmd.render()
        return
      })
    })
  }
  taskSelector.addEventListener('change', () => buttonDisabledOnLoading(loadCurrentSelectFile()))
  staffSelector.addEventListener('change', () => buttonDisabledOnLoading(loadCurrentSelectFile()))

  taskSelector.selectedIndex = Math.floor(Math.random() * taskSelector.options.length)
  buttonDisabledOnLoading(loadCurrentSelectFile()).then(() => {})


  const audioContext = new AudioContext()
  audioContext.suspend().then(() => {})

  var midiPlayer: MidiPlayer.Player | null = null

  const sfNameToUrl = (name: string) => `./soundfonts/${name}-mp3.js`
  var sfPlayers: Map<string, Soundfont.Player> | null = new Map();
  var sfPlayer: Soundfont.Player | null = null

  const instrumentNames = Array.from(instrumentSelector.options).map(o => o.value);
  (() => {
    console.log("soundfont instruments loading.")
    Promise.all(instrumentNames.map(instrumentName => {
      return Soundfont.instrument(audioContext, instrumentName as InstrumentName, {
        nameToUrl: sfNameToUrl
      })
    })).then(all => {
      const map: Map<string, Soundfont.Player> = new Map()
      instrumentNames.forEach((e, i) => map.set(e, all[i]))
      sfPlayers = map
      sfPlayer = sfPlayers.get(instrumentNames[0])!
      console.log("soundfont instruments loaded.")
    })
  })()

  const changeInstrument = () => {
    midiStop()
    const instrumentName = instrumentSelector.options[instrumentSelector.selectedIndex].value
    if (sfPlayers === null) {
      console.log("soundfont instruments has not been loaded.")
      return
    }
    sfPlayer = sfPlayers.get(instrumentName)!
  }
  instrumentSelector.addEventListener('change', () => changeInstrument())


  const midiPlay = () => {
    if (sfPlayer === null) {
      console.log("soundfont instrument has not been loaded.")
      return
    }
    if (midiFiles === null) {
      console.log("midi files has not been loaded.")
      return
    }

    const transp = parseInt(transposeInput.value)

    audioContext.resume().then(() => {})

    const nodesThatMustBeStopped: Map<string, Soundfont.Player> = new Map()

    midiPlayer = new MidiPlayer.Player((event: any) => {
      if (sfPlayer === null) {
        console.log("soundfont instrument has not been loaded.")
        return
      }

      if (event.name == 'Note on') {
        const noteId = `${event.channel}-${event.noteNumber}`
        const node: Soundfont.Player = sfPlayer.start(event.noteNumber + transp, audioContext.currentTime, {gain: event.velocity / 100})
        nodesThatMustBeStopped.set(noteId, node)
      }
      if (event.name == 'Note off') {
        const noteId = `${event.channel}-${event.noteNumber}`
        const node = nodesThatMustBeStopped.get(noteId)
        if (node !== undefined) {
          node.stop()
          nodesThatMustBeStopped.delete(noteId)
        }
      }
    })
    midiPlayer.on('endOfFile', () => {
      if (sfPlayer === null) {
        console.log("soundfont instrument has not been loaded.")
        return
      }
      sfPlayer.stop()
    })

    const task = taskSelector.options[taskSelector.selectedIndex].value
    const midiData = midiFiles.get(task)
    if (midiData === undefined) {
      console.log(`midi file of task ${task} not found! something wrong!`)
    } else {
      midiPlayer.loadArrayBuffer(midiData)
      midiPlayer.play()
    }

  }

  function midiStop() {
    if (sfPlayer === null) {
      console.log("soundfont instrument has not been loaded.")
      return
    }

    sfPlayer.stop()

    if (midiPlayer === null) {
      console.log("midi player has not been started.")
      return
    }
    midiPlayer.stop()
  }

  const clickEventType = ((window.ontouchstart !== null) ? 'click' : 'touchend');
  playButton.addEventListener(clickEventType, midiPlay)
  stopButton.addEventListener(clickEventType, midiStop)


  const next = () => {
    transposeInput.value = (Math.floor(Math.random() * (6 - (-5) + 1) + (-5))).toString()
    taskSelector.selectedIndex = Math.floor(Math.random() * taskSelector.options.length)
    midiStop();
    if (autoHideCheckbox.checked) {
      osmdRenderAreaAboveDiv.classList.add("hide-osmd")
    }
    if (autoPlayCheckbox.checked) {
      return buttonDisabledOnLoading(loadCurrentSelectFile().then(() => {
        midiPlay();
      }))
    } else {
      return buttonDisabledOnLoading(loadCurrentSelectFile()).then(() => {})
    }
  }
  transposeInput.value = (Math.floor(Math.random() * (6 - (-5) + 1) + (-5))).toString()
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
    midiStop();

    transposeInput.value = num.toString()
    return loadCurrentSelectFile()
  }

  const transposeRandom = () => {
    return transpose((Math.floor(Math.random() * (6 - (-5) + 1) + (-5))))
  }
  const transposeDown = () => {
    return transpose(parseInt(transposeInput.value) - 1)
  }
  const transposeUp = () => {
    return transpose(parseInt(transposeInput.value) + 1)
  }

  transposeDownButton.addEventListener(clickEventType, transposeDown)
  transposeRandomButton.addEventListener(clickEventType, transposeRandom)
  transposeUpButton.addEventListener(clickEventType, transposeUp)

}

init()
