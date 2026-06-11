let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

export function tocarSomNotificacao() {
  try {
    const ctx = getAudioContext()
    const oscilador = ctx.createOscillator()
    const ganho = ctx.createGain()
    oscilador.connect(ganho)
    ganho.connect(ctx.destination)
    oscilador.type = 'sine'
    oscilador.frequency.setValueAtTime(880, ctx.currentTime)
    oscilador.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
    ganho.gain.setValueAtTime(0.3, ctx.currentTime)
    ganho.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    oscilador.start(ctx.currentTime)
    oscilador.stop(ctx.currentTime + 0.3)
  } catch {
  }
}

export function tocarSomAlerta() {
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const ganho = ctx.createGain()
    osc.connect(ganho)
    ganho.connect(ctx.destination)
    osc.type = 'square'
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15)
    osc.frequency.setValueAtTime(440, ctx.currentTime + 0.3)
    ganho.gain.setValueAtTime(0.2, ctx.currentTime)
    ganho.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch {
  }
}
