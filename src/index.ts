import {OpenSheetMusicDisplay as OSMD} from 'opensheetmusicdisplay'

function init() {
  const div = document.createElement('div')
  const options = {
    autoResize: true,
    drawTitle: false,
    drawPartNames: false,
  }
  const osmd: OSMD = new OSMD(div, options)
  document.body.appendChild(div)
}

console.log('hello')
init()