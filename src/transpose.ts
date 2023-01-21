type Pitch = { octave: number, fifth: number }

type MusicXMLPitch = { step: string, octave: number, alter: number }

function dom2musicXmlPitch(dom: XMLDocument): MusicXMLPitch {
  const alterDom = dom.querySelector("alter");
  return {
    step: dom.querySelector("step")!.textContent!,
    alter: alterDom != null ? parseInt(alterDom.textContent!) : 0,
    octave: parseInt(dom.querySelector("octave")!.textContent!)
  }
}

function musicXmlPitch2pitch(musicXmlPitch: MusicXMLPitch): Pitch {

  var pitch: Pitch | null = null;
  if (musicXmlPitch.step == "C") {
    pitch = {octave: -4, fifth: 0};
  } else if (musicXmlPitch.step == "D") {
    pitch = {octave: -5, fifth: 2};
  } else if (musicXmlPitch.step == "E") {
    pitch = {octave: -6, fifth: 4};
  } else if (musicXmlPitch.step == "F") {
    pitch = {octave: -3, fifth: -1};
  } else if (musicXmlPitch.step == "G") {
    pitch = {octave: -4, fifth: 1};
  } else if (musicXmlPitch.step == "A") {
    pitch = {octave: -5, fifth: 3};
  } else if (musicXmlPitch.step == "B") {
    pitch = {octave: -6, fifth: 5};
  } else {
    throw new Error
  }
  pitch.octave += musicXmlPitch.octave;
  pitch.octave += -4 * musicXmlPitch.alter;
  pitch.fifth += 7 * musicXmlPitch.alter;

  return pitch;
}

function transpose(p1: Pitch, p2: Pitch): Pitch {
  return {
    octave: p1.octave + p2.octave,
    fifth: p1.fifth + p2.fifth
  }
}

function pitch2musicXmlPitch(pitch: Pitch): MusicXMLPitch {

  var fifth = pitch.fifth
  var octave = pitch.octave
  const musicXmlPitch = {step: "C", alter: 0, octave: 0};

  for (let i = 0; i < 2; i++) {
    if (fifth < -1) {
      fifth += 7
      octave -= 4
      musicXmlPitch.alter -= 1
    } else if (fifth > 5) {
      fifth -= 7
      octave += 4
      musicXmlPitch.alter += 1
    } else {
      break
    }
  }

  musicXmlPitch.octave += octave

  if (fifth == -1) {
    musicXmlPitch.step = "F"
    musicXmlPitch.octave += 3
  } else if (fifth == 0) {
    musicXmlPitch.step = "C"
    musicXmlPitch.octave += 4
  } else if (fifth == 1) {
    musicXmlPitch.step = "G"
    musicXmlPitch.octave += 4
  } else if (fifth == 2) {
    musicXmlPitch.step = "D"
    musicXmlPitch.octave += 5
  } else if (fifth == 3) {
    musicXmlPitch.step = "A"
    musicXmlPitch.octave += 5
  } else if (fifth == 4) {
    musicXmlPitch.step = "E"
    musicXmlPitch.octave += 6
  } else if (fifth == 5) {
    musicXmlPitch.step = "B"
    musicXmlPitch.octave += 6
  }

  return musicXmlPitch
}

function musicXmlPitch2dom(musicXmlPitch: MusicXMLPitch): Element {

  const pitchDom = document.createElement("pitch")
  const stepDom = document.createElement("step")
  stepDom.innerText = musicXmlPitch.step.toString();
  pitchDom.appendChild(stepDom);
  if (musicXmlPitch.alter != 0) {
    const alterDom = document.createElement("alter")
    alterDom.innerText = musicXmlPitch.alter.toString();
    pitchDom.appendChild(alterDom);
  }
  const octaveDom = document.createElement("octave")
  octaveDom.innerText = musicXmlPitch.octave.toString();
  pitchDom.appendChild(octaveDom);
  return pitchDom;
}

function _transposeMusicXML(_xml: XMLDocument, transp: Pitch, dropStemElement: boolean): XMLDocument {
  const xml = _xml.cloneNode(true) as XMLDocument

  // @ts-ignore
  const pitchElems: Element[] = Array.from(xml.querySelectorAll("pitch").values());

  // @ts-ignore
  const newDoms = pitchElems.map(d => musicXmlPitch2dom(pitch2musicXmlPitch(transpose(musicXmlPitch2pitch(dom2musicXmlPitch(d)), transp))));

  // @ts-ignore
  for (var i = 0; i < pitchElems.length; i++) {
    // @ts-ignore
    pitchElems[i].replaceChildren(...Array.from(newDoms[i].childNodes.values()));
  }

  // key signature
  // @ts-ignore
  const fifthsElems: Element[] = Array.from(xml.querySelectorAll("fifths").values());
  fifthsElems.forEach(fifthsElem => {
    fifthsElem.textContent = (parseInt(fifthsElem.textContent!) + transp.fifth).toString()
  })

  // accidental
  // If note has accidental, reassign it according to pitch alter
  // @ts-ignore
  const noteElems: Element[] = Array.from(xml.querySelectorAll("note").values());
  noteElems.forEach(noteElem => {
    const accidentalElem = noteElem.querySelector("accidental")
    const alter = noteElem.querySelector("alter")
    if (accidentalElem != null) {
      if (alter == null || alter.textContent == "0") {
        accidentalElem.textContent = "natural"
      } else if (alter.textContent == "1") {
        accidentalElem.textContent = "sharp"
      } else if (alter.textContent == "2") {
        accidentalElem.textContent = "double-sharp"
      } else if (alter.textContent == "-1") {
        accidentalElem.textContent = "flat"
      } else if (alter.textContent == "-2") {
        accidentalElem.textContent = "flat-flat"
      }
    }
  })

  if (dropStemElement) {
    // @ts-ignore
    const stemElems: Element[] = Array.from(xml.querySelectorAll("stem").values());
    stemElems.forEach(stemElem => stemElem.remove())
  }

  return xml;
}

export function transposeMusicXML(xml: XMLDocument, num: number, dropStemElement: boolean): XMLDocument {

  var transps: Pitch[] | null = null
  var fifth = parseInt(xml.querySelector("fifths")!.textContent!)
  if (fifth <= 0) {
    transps = [
      {octave: 0, fifth: 0},
      {octave: 3, fifth: -5},
      {octave: -1, fifth: 2},
      {octave: 2, fifth: -3},
      {octave: -2, fifth: 4},
      {octave: 1, fifth: -1},
      {octave: 4, fifth: -6}, // Gb
      {octave: 0, fifth: 1},
      {octave: 3, fifth: -4},
      {octave: -1, fifth: 3},
      {octave: 2, fifth: -2},
      {octave: -2, fifth: 5},
    ]
  } else {
    transps = [
      {octave: 0, fifth: 0},
      {octave: 3, fifth: -5},
      {octave: -1, fifth: 2},
      {octave: 2, fifth: -3},
      {octave: -2, fifth: 4},
      {octave: 1, fifth: -1},
      {octave: -3, fifth: 6}, // F#
      {octave: 0, fifth: 1},
      {octave: 3, fifth: -4},
      {octave: -1, fifth: 3},
      {octave: 2, fifth: -2},
      {octave: -2, fifth: 5},
    ]
  }
  const origKeyIndex = transps.findIndex(p => p.fifth == fifth)
  const targetKeyIndex = (((origKeyIndex + num) % 12) + 12) % 12

  const transp: Pitch = {
    octave: transps[targetKeyIndex].octave - transps[origKeyIndex].octave + Math.floor((origKeyIndex + num) / 12),
    fifth: transps[targetKeyIndex].fifth - transps[origKeyIndex].fifth,
  }

  return _transposeMusicXML(xml, transp, dropStemElement)

}