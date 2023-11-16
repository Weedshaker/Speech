// @ts-check

/* global Vosk */

/**
* Speech
*
* @export
* @class Index
* @type {CustomElementConstructor}
*/
export default class Index extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    
    this.changeEventListener = (event, setDefault = true) => {
      const selected = Array.from(event.composedPath()[0].children).find(child => child.selected)
      Array.from(event.composedPath()[0].children).forEach(child => child === selected
        ? child.setAttribute('selected', 'true')
        : child.removeAttribute('selected')
      )
      if (setDefault) {
        this.activeLanguage = selected.getAttribute('lang')
        this.activeVoice = selected.getAttribute('name')
      }
    }
    this.liChangeEventListener = event => {
      this.changeEventListener(event, false)
      this.setAllTexts()
    }
    this.clickEventListener = event => {
      const target = event.composedPath().find(element => element.hasAttribute?.('id'))
      const id = target?.getAttribute('id')
      if (!id) return
      switch (true) {
        case id === 'add-to-list':
          if (!this.textarea?.value) {
            this.textarea?.focus()
            break
          }
          this.setText(undefined, `<div><span>${this.textarea?.value}</span>${this.select?.outerHTML}<div id="delete">X</div></div>`)
          this.renderOl()
        case id === 'clear':
          if (this.textarea) this.textarea.value = ''
          this.lastVoskValue = ''
          break
        case id === 'speak':
          this.speak(this.textarea?.value)
          break
        case id.includes('text-'):
          this.speak(target.querySelector('div > span'))
          break
        case id === 'delete':
          this.deleteText(Array.from(target.parentElement.parentElement.parentElement.children).indexOf(target.parentElement.parentElement))
          this.renderOl()
        case id === 'record':
          this.recordBtn?.classList.toggle('active')
          if (this.recordBtn?.classList.contains('active')) {
            this.mouseDownEventListener(event)
          } else {
            this.mouseUpEventListener(event)
          }
          break
      }
    }
    this.keydownListener = event => {
      if (this.textarea?.matches(':focus')) return
      // @ts-ignore
      if (event.key === 'r' && !this.recordBtn?.classList.contains('active')) this.recordBtn?.click()
    }
    this.keyupListener = event => {
      if (this.textarea?.matches(':focus')) return
      if (event.key === 'r' && this.recordBtn?.classList.contains('active')) {
        // @ts-ignore
        this.recordBtn?.click()
      } else if (event.key === 's') {
        // @ts-ignore
        return this.speakBtn?.click()
      } else if (event.key === 'a') {
        // @ts-ignore
        return this.addToListBtn?.click()
      } else if (event.key === 'c') {
        // @ts-ignore
        return this.clearBtn?.click()
      }
      let span
      if ((span = this.ol?.querySelector(`#text-${event.key - 1} > div > span`))) this.speak(span)
    }
    this.mouseDownEventListener = async event => {
      if (this.voskModel) {
        if (!this.lastVoskValue) {
          this.lastVoskValue = this.textarea?.value || ''
        } else if (this.textarea) {
          this.textarea.value = this.lastVoskValue
        }
        (await this.voskModel).start()
      }
    }
    this.mouseUpEventListener = async event => {
      if (this.voskModel) (await this.voskModel).stop()
    }
  }
  async connectedCallback () {
    if (this.shouldRenderCSS()) this.renderCSS()
    if (this.shouldRenderHTML()) {
      await this.renderHTML()
      this.voskModel = this.vosk()
    }
    this.select?.addEventListener('change', this.changeEventListener)
    this.addEventListener('click', this.clickEventListener)
    /*
    // mousedown and up did not work on mobile, replaced at click event listener
    if (this.recordBtn) this.recordBtn.addEventListener('mousedown', this.mouseDownEventListener)
    if (this.recordBtn) this.recordBtn.addEventListener('mouseup', this.mouseUpEventListener)
    */
    document.addEventListener('keydown', this.keydownListener)
    document.addEventListener('keyup', this.keyupListener)
  }
  
  disconnectedCallback () {
    this.select?.removeEventListener('change', this.changeEventListener)
    this.removeEventListener('click', this.clickEventListener)
    /*
    if (this.recordBtn) this.recordBtn.removeEventListener('mousedown', this.mouseDownEventListener)
    if (this.recordBtn) this.recordBtn.removeEventListener('mouseup', this.mouseUpEventListener)
    */
    document.removeEventListener('keydown', this.keydownListener)
    document.removeEventListener('keyup', this.keyupListener)
  }
  
  /**
  * evaluates if a render is necessary
  *
  * @return {boolean}
  */
  shouldRenderCSS () {
    return !this.css
  }
  
  /**
  * evaluates if a render is necessary
  *
  * @return {boolean}
  */
  shouldRenderHTML () {
    // @ts-ignore
    return !this.section
  }
  
  /**
  * renders the css
  *
  * @return {void}
  */
  renderCSS () {
    this.css = document.createElement('style')
    this.shadowRoot?.appendChild(this.css)
    this.css.textContent = /* css */ `
    :host {
      font-size: var(--font-size, 10px);
      font-weight: var(--font-weight, normal);
      line-height: var(--line-height, normal);
      word-break: var(--word-break, normal);
    }
    button {
      background-color: var(--color);
      border: 3px white solid;
      cursor: pointer;
      font-size: 1.1em;
      padding: 0.75em;
    }
    button:active, button.active {
      background-color: var(--color-active) !important;
    }
    :host > section {
      display: grid;
      grid-template-areas: "header"
      "main"
      "footer";
      grid-template-columns: 100%;
      grid-template-rows: minmax(var(--header-min-height , var(--spacing)), auto) 1fr minmax(var(--footer-min-height, var(--spacing)), auto);
      min-height: var(--min-height, 100dvh);
      max-height: 100dvh;
      & > header {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5em;
        grid-area: header;
        padding: 1em;
        & > div{
          flex-grow: 1;
          & > select {
            background-color: var(--color);
            cursor: pointer;
            font-size: 1.3em;
            height: 4em;
            padding: 1em;
            width: 100%;
          }
        }
      }
      & > main {
        grid-area: main;
        overflow-y: scroll;
        padding: 1em;
        & > ol {
          margin: 0;
          padding: 0 0 0 1em;
          & > li {
            background-color: var(--color);
            box-sizing: border-box;
            color: var(--background-color);
            cursor: pointer;
            font-size: 1.1em;
            height: min(100%, 3.5em);
            margin-bottom: 1em;
            padding: 0.5em;
            width: 100%;
            & > div {
              align-items: center;
              display: flex;
              gap: 0.5em;
              justify-content: space-between;
              & > select {
                cursor: pointer;
                padding: 1em;
                width: 100%;
              }
              & > div {
                display: flex;
                min-height: 40px;
                min-width: 40px;
                align-items: center;
                justify-content: center;
              }
            }
          }
          & > li::marker {
            color: var(--color);
          }
        }
      }
      & > footer {
        grid-area: footer;
        padding: 1em;
        & textarea {
          background-color: var(--color);
          box-sizing: border-box;
          font-size: 1.1em;
          height: 10dvh;
          padding: 1em;
          transition: height 0.3s ease-out;
          width: 100%;
          & + div {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5em;
            justify-content: space-between;
            & > #clear {
              background-color: coral;
            }
          }
        }
        & textarea:focus {
          height: 25dvh;
        }
      }
    }
    @media only screen and (max-width: 767px) {
      :host {
        --spacing: 0.5em;
        font-size: var(--font-size-mobile, var(--font-size, 10px));
        font-weight: var(--font-weight-mobile, var(--font-weight, normal));
        line-height: var(--line-height-mobile, var(--line-height, normal));
        word-break: var(--word-break-mobile, var(--word-break, normal));
      }
      button {
        font-size: 1em;
        padding: 0.5em;
      }
      :host > section {
        grid-template-rows: minmax(var(--header-height-mobile, var(--header-height, var(--spacing))), auto) 1fr minmax(var(--footer-min-height-mobile, var(--footer-min-height, var(--spacing))), auto);
        & > header {
          gap: 0.25em;
          padding: 0.5em;
          & > div{
            & > select {
              font-size: 1.2em;
              height: 3em;
              padding: 0.5em;
            }
          }
        }
      }
    }
    `
  }
  
  /**
  * renders the html
  *
  * @return {Promise<void>}
  */
  async renderHTML () {
    this.section = document.createElement('section')
    this.shadowRoot?.appendChild(this.section)
    const voices = await this.getVoices()
    this.section.innerHTML = /* html */`
    <header>
    <iframe class=gh-button src="https://ghbtns.com/github-btn.html?user=Weedshaker&amp;repo=Speech&amp;type=star&amp;count=true&amp;size=large" scrolling="0" width="160px" height="30px" frameborder="0"></iframe>
    <div>
    <label for="language-select">Choose a language:</label>
    <select name="languages" id="language-select">
    ${voices.map(voice => `<option ${voice.lang === this.activeLanguage
      ? 'selected'
      : ''
    } value="${voice.lang} - ${voice.name}" name="${voice.name}" lang="${voice.lang}">${voice.lang} - ${voice.name}</option>`)}
    </select>
    </div>
    </header>
    <main>
    <label for="speech-list-container">Click an element to speak:</label>
    <ol name="speech-list" id="speech-list-container"></ol>
    </main>
    <footer>
    <label for="speech-textarea">Your text:</label>
    <textarea name="speech" id="speech-textarea" placeholder="Click here and start typing or click the microphone to dictate your text in english!"></textarea>
    <div>
    <button id="record">${this.recordIcon}</button>
    <button id="speak">Speak</button>
    <button id="add-to-list">Add</button>
    <button id="clear">Clear</button>
    </div>
    </footer>
    `
    this.renderOl()
  }
  
  renderOl () {
    if (this.ol) {
      this.ol.innerHTML = /* html */`${this.getAllTexts().map((text, i) => `<li id="text-${i}">${text}</li>`).join('')}`
      Array.from(this.ol.children).forEach(child => child.addEventListener('change', this.liChangeEventListener))
    }
    this.main?.scroll(0, this.main?.scrollHeight)
  }
  
  getVoices () {
    const sort = arr => arr.sort((a, b) => {
      const langA = a.lang.toUpperCase()
      const langB = b.lang.toUpperCase()
      if (langA < langB) return -1
      if (langA > langB) return 1
      return 0
    })
    return this.getVoicesPromise || (this.getVoicesPromise = speechSynthesis.getVoices()?.length
    ? Promise.resolve(sort(Array.from(speechSynthesis.getVoices())))
    : new Promise(resolve => speechSynthesis.addEventListener('voiceschanged', event => resolve(sort(Array.from(speechSynthesis.getVoices()))), { once: true })))
  }
  
  setText (key, value) {
    const allTexts = this.getAllTexts()
    localStorage.setItem('texts', JSON.stringify(Object.assign(allTexts, {[key || allTexts.length]: value})))
  }
  
  deleteText (key) {
    const allTexts = this.getAllTexts()
    allTexts.splice(key, 1)
    localStorage.setItem('texts', JSON.stringify(allTexts))
  }
  
  setAllTexts () {
    if (this.ol) localStorage.setItem('texts', JSON.stringify(Array.from(this.ol.children).map(li => li.innerHTML)))
  }
  
  getAllTexts () {
    try {
      return JSON.parse(localStorage.getItem('texts') || '[]') || []
    } catch (e) {
      return []
    }
  }
  
  async speak (text) {
    if (!text) return
    let lang = this.activeLanguage
    let voice = (await this.getVoices()).find(voice => voice.name === this.activeVoice)
    if (text instanceof HTMLElement) {
      const element = text
      text = text.textContent
      let select
      let selected
      // @ts-ignore
      if ((select = element.parentElement.querySelector('select')) && (selected = Array.from(select.children).find(child => child.selected))) {
        lang = selected.getAttribute('lang') || ''
        voice = (await this.getVoices()).find(voice => voice.name === selected.getAttribute('name'))
      }
    }
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang
    utter.voice = voice
    speechSynthesis.cancel()
    speechSynthesis.speak(utter)
  }
  
  async vosk() {
    const channel = new MessageChannel()
    // @ts-ignore
    const model = await Vosk.createModel(`${import.meta.url.replace(/(.*\/)(.*)$/, '$1')}vosk-model-small-en-us-0.15.tar.gz`)
    model.registerPort(channel.port1)
    
    const sampleRate = 48000
    const recognizer = new model.KaldiRecognizer(sampleRate)
    recognizer.setWords(true)
    
    this.utterance = []
    this.lastVoskValue = ''
    recognizer.on("result", (message) => {
      (this.utterance = [...this.utterance, message.result]).map((utt, uindex) =>
      utt?.result?.map((word, windex) => word.word + '')
      )
      let send = false
      let deleteText = false
      if (this.textarea) this.textarea.value = this.lastVoskValue + this.utterance.reduce((acc, word) => {
        return word.text ? word.text + '. ' : ''
      }, '')
      // @ts-ignore
      this.lastVoskValue = this.textarea?.value || ''
      if (this.textarea) this.textarea.scrollTop = this.textarea.scrollHeight
    })
    recognizer.on("partialresult", (message) => {
      if (!message.result.partial.trim()) return
      if (this.textarea && /\]$/g.test(this.textarea.value.trim())) {
        this.textarea.value = this.textarea.value.replace(/\[.*\]/, `[${message.result.partial}]`)
      } else if (this.textarea) {
        this.textarea.value += `[${message.result.partial}]`
      }
      if (this.textarea) this.textarea.scrollTop = this.textarea.scrollHeight
    })
    
    
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
        sampleRate
      },
    })
    this.audioContext = new AudioContext()
    await this.audioContext.audioWorklet.addModule(`${import.meta.url.replace(/(.*\/)(.*)$/, '$1')}recognizer-processor.js`)
    const recognizerProcessor = new AudioWorkletNode(this.audioContext, 'recognizer-processor', { channelCount: 1, numberOfInputs: 1, numberOfOutputs: 1 })
    recognizerProcessor.port.postMessage({action: 'init', recognizerId: recognizer.id}, [ channel.port2 ])
    recognizerProcessor.connect(this.audioContext.destination)
    const source = this.audioContext.createMediaStreamSource(mediaStream)
    
    const start = async () => {
      source.connect(recognizerProcessor)
    }
    
    const stop = async () => {
      source.disconnect(recognizerProcessor)
    }
    
    if (this.textarea) this.textarea.focus()
    return {model, mediaStream, start, stop}
  }
  
  set activeLanguage (value) {
    localStorage.setItem('active-language', value)
  }
  
  get activeLanguage () {
    return localStorage.getItem('active-language') || 'ja-JP'
  }
  
  set activeVoice (value) {
    localStorage.setItem('active-voice', value)
  }
  
  get activeVoice () {
    return localStorage.getItem('active-voice') || ''
  }
  
  get select () {
    return this.shadowRoot?.querySelector('header > div > select')
  }
  
  get main () {
    return this.shadowRoot?.querySelector('main')
  }
  
  get ol () {
    return this.shadowRoot?.querySelector('ol')
  }
  
  get textarea () {
    return this.shadowRoot?.querySelector('textarea')
  }
  
  get recordBtn () {
    return this.shadowRoot?.querySelector('#record')
  }
  
  get speakBtn () {
    return this.shadowRoot?.querySelector('#speak')
  }
  
  get addToListBtn () {
    return this.shadowRoot?.querySelector('#add-to-list')
  }
  
  get clearBtn () {
    return this.shadowRoot?.querySelector('#clear')
  }
  
  get recordIcon () {
    return '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-microphone" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 2m0 3a3 3 0 0 1 3 -3h0a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3h0a3 3 0 0 1 -3 -3z" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M8 21l8 0" /><path d="M12 17l0 4" /></svg>'
  }
}
  
  