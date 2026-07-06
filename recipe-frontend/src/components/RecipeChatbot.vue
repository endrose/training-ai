<template>
  <div :class="['chatbot-container', { 'is-open': isOpen }]">
    <div v-if="!isOpen" class="ai-chat-btn cursor-pointer" @click="isOpen = true">
      <div class="row items-center no-wrap">
        <span class="text-h4 q-mr-sm">🤖</span>
        <div class="column text-left text-black">
          <span class="text-weight-bolder text-h6" style="line-height: 1;">AI CHEF</span>
        </div>
      </div>
      <q-btn class="ask-btn full-width q-mt-sm" color="lime" text-color="black" label="ASK RECIPE" no-caps dense />
    </div>

    <div v-if="isOpen" class="chat-window column">
      <div class="chat-header row items-center q-py-sm q-px-md no-wrap">
        <q-avatar icon="restaurant" color="white" text-color="black" size="sm" square class="q-mr-sm avatar-brutal" />
        <div>
          <div class="text-subtitle2 text-weight-bolder">CHEF AI</div>
          <div class="text-caption">Asisten Dapur Anda</div>
        </div>
        <q-space />
        <q-btn dense flat round icon="close" text-color="black" @click="isOpen = false" />
      </div>

      <div class="chat-messages col overflow-auto q-pa-md">
        <div v-for="(msg, index) in messages" :key="index"
          :class="['message-row row q-mb-md', msg.isUser ? 'justify-end' : 'justify-start']">
          <div :class="['chat-bubble', msg.isUser ? 'bubble-user' : 'bubble-ai']">
            <!-- Pesan user: plain text, tidak perlu di-parse markdown -->
            <div v-if="msg.isUser" class="chat-text-plain">{{ msg.text }}</div>
            <!-- Pesan AI: di-render sebagai markdown (bold, list, heading) agar rapi -->
            <div v-else class="chat-text-markdown" v-html="renderMarkdown(msg.text)"></div>
          </div>
        </div>
        <div v-if="isLoading" class="row justify-start q-mt-sm">
          <div class="chat-bubble bubble-ai">
            <q-spinner-dots color="black" size="1.5em" />
          </div>
        </div>
      </div>

      <div class="chat-input-bar q-pa-sm row items-center gap-xs no-wrap overflow-auto">
        <q-btn dense flat square :color="isRecording ? 'red' : 'black'"
          :icon="isRecording ? 'mic_off' : 'keyboard_voice'" class="input-icon-btn" @click="toggleSpeechRecognition">
          <q-tooltip>Suara ke Teks (Mic)</q-tooltip>
        </q-btn>

        <q-btn dense flat square color="black" icon="audio_file" class="input-icon-btn" @click="triggerAudioUpload">
          <q-tooltip>Upload File Audio (.mp3)</q-tooltip>
        </q-btn>

        <q-btn dense flat square color="black" icon="image" class="input-icon-btn" @click="triggerImageUpload">
          <q-tooltip>Upload Gambar Masakan</q-tooltip>
        </q-btn>

        <q-btn dense flat square color="black" icon="description" class="input-icon-btn" @click="triggerDocUpload">
          <q-tooltip>Upload Dokumen Resep</q-tooltip>
        </q-btn>

        <input type="file" ref="audioInput" accept="audio/*" style="display: none" @change="handleAudioUploaded" />
        <input type="file" ref="imageInput" accept="image/*" style="display: none" @change="handleImageUploaded" />
        <input type="file" ref="docInput" accept=".pdf,.txt" style="display: none" @change="handleDocUploaded" />

        <q-input v-model="inputMessage" dense outlined square placeholder="Tanya resep / langkah masak..."
          class="col chat-input-field" @keyup.enter="sendTextMessage" />

        <q-btn flat square color="lime" text-color="black" icon="send" class="send-btn" @click="sendTextMessage" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import api from '../services/api';

interface Message {
  text: string;
  isUser: boolean;
}

const props = defineProps<{
  currentRegion: string;
}>();

const $q = useQuasar();
const isOpen = ref<boolean>(false);
const isLoading = ref<boolean>(false);
const isRecording = ref<boolean>(false); // Untuk visual state audio
const inputMessage = ref<string>('');
const audioInput = ref<HTMLInputElement | null>(null);
const imageInput = ref<HTMLInputElement | null>(null);
const docInput = ref<HTMLInputElement | null>(null);

const messages = ref<Message[]>([
  { text: 'Halo! Saya asisten masakmu. Ada yang bisa dibantu untuk menu hari ini?', isUser: false }
]);

// Parser markdown untuk respons AI: bold, list, heading, dsb jadi HTML rapi.
// `breaks: true` supaya newline tunggal dari Gemini tetap jadi <br>.
const md = new MarkdownIt({
  breaks: true,
  linkify: true,
});

// Sanitasi HTML hasil parsing sebelum di-render via v-html,
// karena konten berasal dari API eksternal (Gemini) — mencegah risiko XSS.
const renderMarkdown = (text: string): string => {
  const rawHtml = md.render(text ?? '');
  return DOMPurify.sanitize(rawHtml);
};

// Berikan respon dinamis saat user mengganti wilayah kuliner di dashboard
watch(() => props.currentRegion, (newRegion) => {
  if (newRegion) {
    messages.value.push({
      text: `Saya melihat kamu tertarik dengan menu ${newRegion.toUpperCase()}. Mau saya carikan rekomendasi resep terbaiknya?`,
      isUser: false
    });
  }
});

// 1. Aksi Kirim Chat Teks ke Backend `/generate-text`
const sendTextMessage = async (): Promise<void> => {
  if (!inputMessage.value.trim()) return;

  const userText = inputMessage.value;
  messages.value.push({ text: userText, isUser: true });
  inputMessage.value = '';
  isLoading.value = true;

  try {
    const response = await api.post('/generate-text', {
      prompt: `Context Kategori Kulinari: ${props.currentRegion}. Pertanyaan: ${userText}. Jawab dengan singkat, ramah, dan format yang rapi.`
    });

    messages.value.push({ text: response.data.output, isUser: false });
  } catch (error: any) {
    const errMsg = error.response?.data?.error || 'Gagal mendapatkan respon dari Chef AI.';
    $q.notify({ type: 'negative', message: errMsg, multiLine: true });
  } finally {
    isLoading.value = false;
  }
};

// Web Speech API untuk Speech-to-Text
let recognition: any = null;
const isListening = ref(false);

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'id-ID';

  recognition.onstart = () => {
    isListening.value = true;
    isRecording.value = true; // reusing state for UI red color
    $q.notify({ type: 'info', message: 'Mendengarkan suara Anda...' });
  };

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    inputMessage.value = transcript;
    $q.notify({ type: 'positive', message: 'Suara berhasil dikenali.' });
  };

  recognition.onerror = (event: any) => {
    $q.notify({ type: 'negative', message: 'Gagal mengenali suara: ' + event.error });
    isListening.value = false;
    isRecording.value = false;
  };

  recognition.onend = () => {
    isListening.value = false;
    isRecording.value = false;
  };
}

const toggleSpeechRecognition = (): void => {
  if (isListening.value) {
    recognition?.stop();
  } else {
    if (recognition) {
      recognition.start();
    } else {
      // Fallback if browser doesn't support Web Speech API: trigger audio file upload
      audioInput.value?.click();
      $q.notify({ type: 'warning', message: 'Browser tidak mendukung Speech-to-Text langsung. Silakan upload file audio.' });
    }
  }
};

const triggerAudioUpload = (): void => {
  audioInput.value?.click();
};

const handleAudioUploaded = async (event: Event): Promise<void> => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  messages.value.push({ text: `🎤 Mengirim pesan suara (${file.name})...`, isUser: true });
  isLoading.value = true;

  const formData = new FormData();
  formData.append('audio', file);
  formData.append('prompt', `Saya sedang memasak makanan kategori ${props.currentRegion}. Jawab pertanyaan dari audio ini dengan instruksi yang to-the-point.`);

  try {
    const response = await api.post('/generate-from-audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    messages.value.push({ text: response.data.output, isUser: false });
  } catch (error: any) {
    const errMsg = error.response?.data?.error || 'Gagal memproses audio.';
    $q.notify({ type: 'negative', message: errMsg, multiLine: true });
  } finally {
    isLoading.value = false;
    if (audioInput.value) audioInput.value.value = ''; // Reset input file
  }
};

// 3. Aksi Upload Image ke Backend `/generate-from-image`
const triggerImageUpload = (): void => {
  imageInput.value?.click();
};

const handleImageUploaded = async (event: Event): Promise<void> => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  messages.value.push({ text: `🖼️ Mengirim gambar (${file.name})...`, isUser: true });
  isLoading.value = true;

  const formData = new FormData();
  formData.append('image', file);
  formData.append('prompt', `Analisa gambar makanan/bahan ini dalam konteks kuliner ${props.currentRegion}. Apa nama masakannya atau apa resepnya?`);

  try {
    const response = await api.post('/generate-from-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    messages.value.push({ text: response.data.output, isUser: false });
  } catch (error: any) {
    const errMsg = error.response?.data?.error || 'Gagal memproses gambar.';
    $q.notify({ type: 'negative', message: errMsg, multiLine: true });
  } finally {
    isLoading.value = false;
    if (imageInput.value) imageInput.value.value = ''; // Reset input file
  }
};

// 4. Aksi Upload Dokumen ke Backend `/generate-from-document`
const triggerDocUpload = (): void => {
  docInput.value?.click();
};

const handleDocUploaded = async (event: Event): Promise<void> => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  messages.value.push({ text: `📄 Mengirim dokumen (${file.name})...`, isUser: true });
  isLoading.value = true;

  const formData = new FormData();
  formData.append('document', file);
  formData.append('prompt', `Tolong rangkum resep atau dokumen masakan ini dalam poin-poin yang mudah dibaca.`);

  try {
    const response = await api.post('/generate-from-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    messages.value.push({ text: response.data.output, isUser: false });
  } catch (error: any) {
    const errMsg = error.response?.data?.error || 'Gagal memproses dokumen.';
    $q.notify({ type: 'negative', message: errMsg, multiLine: true });
  } finally {
    isLoading.value = false;
    if (docInput.value) docInput.value.value = ''; // Reset input file
  }
};
</script>

<style scoped>
.chatbot-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
}

.chat-window {
  width: 350px;
  height: 450px;
  overflow: hidden;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  border: 4px solid black;
  border-radius: 0;
  box-shadow: 8px 8px 0px black;
}

@media (max-width: 600px) {
  .chatbot-container.is-open {
    bottom: 0;
    right: 0;
    width: 100%;
    height: 100%;
    z-index: 99999;
  }

  .chatbot-container.is-open .chat-window {
    width: 100vw;
    height: 100vh;
    border: none;
    box-shadow: none;
  }
}

.chat-header {
  background-color: #ff5e00;
  color: black;
  border-bottom: 4px solid black;
}

.avatar-brutal {
  border: 2px solid black;
}

.chat-messages {
  background-color: #fcfcfc;
  background-image:
    linear-gradient(#eaeaea 1px, transparent 1px),
    linear-gradient(90deg, #eaeaea 1px, transparent 1px);
  background-size: 24px 24px;
  flex: 1;
}

.chat-bubble {
  max-width: 78%;
  padding: 10px 14px;
  border: 3px solid black;
  border-radius: 0;
  box-shadow: 4px 4px 0px black;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.bubble-user {
  background-color: #2940ff;
  color: white;
}

.bubble-ai {
  background-color: #ffffff;
  color: black;
}

.chat-input-bar {
  background-color: #fcfcfc;
  border-top: 4px solid black;
}

.input-icon-btn {
  border: 2px solid black;
  border-radius: 0;
  background-color: white;
  box-shadow: 2px 2px 0px black;
  transition: transform 0.1s;
}

.input-icon-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0px black;
}

.chat-input-field :deep(.q-field__control) {
  border: 2px solid black !important;
  border-radius: 0 !important;
  background-color: white;
}

.chat-input-field :deep(.q-field__control):before,
.chat-input-field :deep(.q-field__control):after {
  border: none !important;
}

.send-btn {
  border: 2px solid black;
  border-radius: 0;
  box-shadow: 2px 2px 0px black;
  transition: transform 0.1s;
}

.send-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0px black;
}

.gap-sm {
  gap: 8px;
}

.ai-chat-btn {
  background-color: #ff5e00;
  border: 4px solid black;
  border-radius: 0;
  padding: 15px;
  box-shadow: 6px 6px 0px black;
  display: flex;
  flex-direction: column;
  transition: transform 0.1s;
}

.ai-chat-btn:active {
  transform: translate(4px, 4px);
  box-shadow: 2px 2px 0px black;
}

.ask-btn {
  border: 3px solid black;
  border-radius: 0;
  font-weight: 900;
  box-shadow: 2px 2px 0px black;
}

/* Styling untuk konten markdown hasil respons AI agar mudah dibaca */
.chat-text-plain {
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-text-markdown {
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.chat-text-markdown :deep(p) {
  margin: 0 0 8px 0;
}

.chat-text-markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.chat-text-markdown :deep(strong) {
  font-weight: 700;
}

.chat-text-markdown :deep(ul),
.chat-text-markdown :deep(ol) {
  margin: 4px 0 8px 0;
  padding-left: 20px;
}

.chat-text-markdown :deep(li) {
  margin-bottom: 4px;
}

.chat-text-markdown :deep(h1),
.chat-text-markdown :deep(h2),
.chat-text-markdown :deep(h3) {
  font-size: 14px;
  margin: 8px 0 4px 0;
}

.chat-text-markdown :deep(code) {
  background-color: rgba(0, 0, 0, 0.08);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}
</style>