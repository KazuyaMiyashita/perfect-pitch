
const init = () => {

  const textarea = document.getElementById('textarea')! as HTMLTextAreaElement
  const printError = (msg: string) => {
    textarea.value += msg + "\n"
  }

  const testDiv = document.getElementById('test')!
  testDiv.innerText = "ok"

  const clickEventType = ((window.ontouchstart !== null) ? 'click' : 'touchend');
  const playButton = document.getElementById('play')! as HTMLButtonElement
  const audio = document.getElementById('audio')! as HTMLAudioElement

  const audioContext = new AudioContext()
  audioContext.suspend().then(() => {}, printError)

  const track = audioContext.createMediaElementSource(audio)
  track.connect(audioContext.destination)

  const play = () => {
    // NG(iOS)
    // audioContext.resume().then(() => {
    //   audio.play().then(() => {}, printError)
    // }, printError)

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    audio.play().then(() => {}, printError)
  }

  playButton.addEventListener(clickEventType, play)


}

init()
