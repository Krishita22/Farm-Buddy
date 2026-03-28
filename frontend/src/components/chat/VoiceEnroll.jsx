import { useState, useRef } from 'react'
import { useLanguage } from '../../lib/LanguageContext'
import { Mic, MicOff, Check, X, AudioWaveform } from 'lucide-react'

export default function VoiceEnroll({ farmerId, onComplete }) {
  const { lang } = useLanguage()
  const [stage, setStage] = useState('ready') // ready, recording, analyzing, done
  const [profile, setProfile] = useState(null)
  const [seconds, setSeconds] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  const MESSAGES = {
    en: { title: "Voice Setup", desc: "Read this aloud so I can match your speaking style:", sample: "My name is a farmer. I grow tomatoes and maize on my land. The weather has been good this season.", recording: "Recording your voice...", analyzing: "Analyzing your accent...", done: "Voice profile saved!", skip: "Skip" },
    hi: { title: "आवाज सेटअप", desc: "यह जोर से पढ़ें ताकि मैं आपकी बोलने की शैली से मिला सकूं:", sample: "मेरा नाम एक किसान है। मैं अपनी जमीन पर टमाटर और मक्का उगाता हूं। इस मौसम में मौसम अच्छा रहा है।", recording: "आपकी आवाज रिकॉर्ड हो रही है...", analyzing: "आपकी बोली का विश्लेषण...", done: "आवाज प्रोफाइल सहेजा गया!", skip: "छोड़ें" },
    sw: { title: "Usanidi wa Sauti", desc: "Soma hii kwa sauti ili niweze kulinganisha na mtindo wako:", sample: "Jina langu ni mkulima. Ninakuza nyanya na mahindi shambani mwangu. Hali ya hewa imekuwa nzuri msimu huu.", recording: "Inarekodi sauti yako...", analyzing: "Inachunguza lafudhi yako...", done: "Wasifu wa sauti umehifadhiwa!", skip: "Ruka" },
    fr: { title: "Configuration vocale", desc: "Lisez ceci à voix haute:", sample: "Je suis un agriculteur. Je cultive des tomates et du maïs sur ma terre. Le temps a été bon cette saison.", recording: "Enregistrement...", analyzing: "Analyse de votre accent...", done: "Profil vocal enregistré!", skip: "Passer" },
  }
  const msg = MESSAGES[lang] || MESSAGES.en

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        clearInterval(timerRef.current)
        setStage('analyzing')

        const blob = new Blob(chunksRef.current, { type: mr.mimeType })
        const formData = new FormData()
        formData.append('audio', blob, 'enroll.webm')

        try {
          const res = await fetch(`/api/voice/enroll?farmer_id=${farmerId}`, { method: 'POST', body: formData })
          const data = await res.json()
          if (data.status === 'enrolled') {
            setProfile(data.profile)
            setStage('done')
            setTimeout(() => onComplete?.(data.profile), 2000)
          } else {
            setStage('ready')
          }
        } catch {
          setStage('ready')
        }
      }
      mediaRecorderRef.current = mr
      mr.start(250)
      setStage('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      alert('Microphone access needed for voice enrollment.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-farm-400 to-farm-600 flex items-center justify-center mx-auto mb-4">
          <AudioWaveform size={24} className="text-white" />
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-1">{msg.title}</h3>

        {stage === 'ready' && (
          <>
            <p className="text-sm text-gray-500 mb-3">{msg.desc}</p>
            <div className="bg-farm-50 rounded-2xl p-4 mb-4 text-sm text-farm-800 leading-relaxed border border-farm-200">
              "{msg.sample}"
            </div>
            <button onClick={startRecording}
              className="w-full py-3 bg-farm-600 text-white rounded-2xl font-semibold hover:bg-farm-700 transition-colors flex items-center justify-center gap-2">
              <Mic size={18} /> Start Recording
            </button>
            <button onClick={() => onComplete?.(null)}
              className="mt-2 text-sm text-gray-400 hover:text-gray-600">{msg.skip}</button>
          </>
        )}

        {stage === 'recording' && (
          <>
            <p className="text-sm text-gray-500 mb-4">{msg.recording}</p>
            <div className="text-4xl font-bold text-red-500 mb-4 tabular-nums">{seconds}s</div>
            <div className="bg-farm-50 rounded-2xl p-4 mb-4 text-sm text-farm-800 leading-relaxed border border-farm-200 opacity-60">
              "{msg.sample}"
            </div>
            <button onClick={stopRecording}
              className="w-full py-3 bg-red-500 text-white rounded-2xl font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 mic-recording">
              <MicOff size={18} /> Stop Recording ({seconds >= 3 ? 'ready!' : `need ${3 - seconds}s more`})
            </button>
          </>
        )}

        {stage === 'analyzing' && (
          <div className="py-8">
            <div className="w-10 h-10 border-3 border-farm-200 border-t-farm-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">{msg.analyzing}</p>
          </div>
        )}

        {stage === 'done' && profile && (
          <>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Check size={24} className="text-green-600" />
            </div>
            <p className="text-sm text-green-600 font-medium mb-3">{msg.done}</p>
            <div className="bg-gray-50 rounded-2xl p-3 text-xs text-left space-y-1">
              <p><span className="font-medium text-gray-600">Pitch:</span> <span className="text-gray-500">{profile.pitch_class} ({profile.pitch_hz}Hz)</span></p>
              <p><span className="font-medium text-gray-600">Speed:</span> <span className="text-gray-500">{profile.speed_class} ({profile.speed_syllables_per_sec} syl/s)</span></p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
