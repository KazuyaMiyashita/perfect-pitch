import {
  MidiInstrument,
  OpenSheetMusicDisplay as OSMD,
  TransposeCalculator,
} from 'opensheetmusicdisplay'
import {transposeMusicXML} from './transpose'

const init = () => {
  console.log('init')

  const sheets = [
    './sheets/chouon-001-four-staves.musicxml',
    './sheets/chouon-001-grand-staff.musicxml',
    './sheets/chouon-002-four-staves.musicxml',
    './sheets/chouon-002-grand-staff.musicxml',
    './sheets/chouon-003-four-staves.musicxml',
    './sheets/chouon-003-grand-staff.musicxml',
    './sheets/chouon-004-four-staves.musicxml',
    './sheets/chouon-004-grand-staff.musicxml',
    './sheets/chouon-005-four-staves.musicxml',
    './sheets/chouon-005-grand-staff.musicxml',
    './sheets/chouon-006-four-staves.musicxml',
    './sheets/chouon-006-grand-staff.musicxml',
    './sheets/chouon-007-four-staves.musicxml',
    './sheets/chouon-007-grand-staff.musicxml',
    './sheets/chouon-008-four-staves.musicxml',
    './sheets/chouon-008-grand-staff.musicxml',
    './sheets/chouon-009-four-staves.musicxml',
    './sheets/chouon-009-grand-staff.musicxml',
    './sheets/chouon-010-four-staves.musicxml',
    './sheets/chouon-010-grand-staff.musicxml',
    './sheets/chouon-011-four-staves.musicxml',
    './sheets/chouon-011-grand-staff.musicxml',
    './sheets/chouon-012-four-staves.musicxml',
    './sheets/chouon-012-grand-staff.musicxml',
    './sheets/chouon-013-four-staves.musicxml',
    './sheets/chouon-013-grand-staff.musicxml',
    './sheets/chouon-014-four-staves.musicxml',
    './sheets/chouon-014-grand-staff.musicxml',
    './sheets/chouon-015-four-staves.musicxml',
    './sheets/chouon-015-grand-staff.musicxml',
    './sheets/chouon-031-four-staves.musicxml',
    './sheets/chouon-031-grand-staff.musicxml',
    './sheets/chouon-032-four-staves.musicxml',
    './sheets/chouon-032-grand-staff.musicxml',
    './sheets/chouon-033-four-staves.musicxml',
    './sheets/chouon-033-grand-staff.musicxml',
    './sheets/chouon-034-four-staves.musicxml',
    './sheets/chouon-034-grand-staff.musicxml',
    './sheets/chouon-035-four-staves.musicxml',
    './sheets/chouon-035-grand-staff.musicxml',
    './sheets/chouon-061-four-staves.musicxml',
    './sheets/chouon-061-grand-staff.musicxml',
    './sheets/chouon-062-four-staves.musicxml',
    './sheets/chouon-062-grand-staff.musicxml',
    './sheets/chouon-063-four-staves.musicxml',
    './sheets/chouon-063-grand-staff.musicxml',
    './sheets/chouon-064-four-staves.musicxml',
    './sheets/chouon-064-grand-staff.musicxml',
    './sheets/chouon-065-four-staves.musicxml',
    './sheets/chouon-065-grand-staff.musicxml',
  ]
  const sheetDocumentsPromise: Promise<Map<string, Document>> = (() => {
    const domParser = new DOMParser()
    return Promise.all(sheets.map(sheet => {
      return fetch(sheet).then(res => res.text()).then(data => domParser.parseFromString(data, 'text/xml'))
    })).then(all => {
      const map: Map<string, Document> = new Map()
      sheets.forEach((e, i) => map.set(e, all[i]))
      return map
    })
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
  const transposeDownButton = getElementByIdOrError('transpose-down') as HTMLButtonElement
  const transposeRandomButton = getElementByIdOrError('transpose-random') as HTMLButtonElement
  const transposeUpButton = getElementByIdOrError('transpose-up') as HTMLButtonElement
  const nextButton = document.getElementById('next') as HTMLButtonElement
  const autoHideCheckbox = document.getElementById('auto-hide') as HTMLInputElement
  const autoPlayCheckbox = document.getElementById('auto-play') as HTMLInputElement


  const options = {
    autoResize: true,
    drawTitle: false,
    drawPartNames: false,
  }
  const osmd: OSMD = new OSMD(osmdRenderAreaDiv, options)
  osmd.TransposeCalculator = new TransposeCalculator()

  const getFileName = (task: string, staff: string) => {
    return `./sheets/${task}-${staff}.musicxml`
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



  const clickEventType = ((window.ontouchstart !== null) ? 'click' : 'touchend');

  const next = () => {
    transposeInput.value = (Math.floor(Math.random() * (6 - (-5) + 1) + (-5))).toString()
    taskSelector.selectedIndex = Math.floor(Math.random() * taskSelector.options.length)
    if (autoHideCheckbox.checked) {
      osmdRenderAreaAboveDiv.classList.add("hide-osmd")
    }
    if (autoPlayCheckbox.checked) {
      return buttonDisabledOnLoading(loadCurrentSelectFile().then(() => {}))
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

  const keyup = (e: KeyboardEvent) => {
    if (e.code == 'Space') {

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
