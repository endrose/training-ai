<template>
  <div :class="['chatbot-container', { 'is-open': isOpen }]">
    <div
      v-if="!isOpen"
      class="ai-chat-btn cursor-pointer"
      @click="isOpen = true"
    >
      <div class="row items-center no-wrap">
        <span class="text-h4 q-mr-sm">🤖</span>
        <div class="column text-left text-black">
          <span class="text-weight-bolder text-h6" style="line-height: 1;">AI CHAT</span>
        </div>
      </div>
      <q-btn class="ask-btn full-width q-mt-sm" color="lime" text-color="black" label="ASK RECIPE" no-caps dense />
    </div>

    <q-card v-if="isOpen" class="chat-window shadow-10 display-flex column">
      <q-card-section class="bg-primary text-white row items-center q-py-sm">
        <q-avatar icon="restaurant" color="white" text-color="primary" size="sm" class="q-mr-sm" />
        <div>
          <div class="text-subtitle2 text-weight-bold">Chef Gemini AI</div>
          <div class="text-caption text-grey-3">Asisten Dapur Anda</div>
        </div>
        <q-space />
        <q-btn dense flat round icon="close" @click="isOpen = false" />
      </q-card-section>

      <q-card-section class="chat-messages col overflow-auto q-pa-md">
        <div 
          v-for="(msg, index) in messages" 
          :key="index"
          :class="['message-wrapper q-mb-sm', msg.isUser ? 'justify-end' : 'justify-start']"
          class="row"
        >
          <q-chat-message
            :text="[msg.text]"
            :sent="msg.isUser"
            :bg-color="msg.isUser ? 'primary' : 'grey-3'"
            :text-color="msg.isUser ? 'white' : 'black'"
          />
        </div>
        <div v-if="isLoading" class="row justify-start q-mt-sm">
          <q-spinner-dots color="primary" size="2em" />
        </div>
      </q-card-section>

      <q-separator />
      <q-card-section class="q-pa-sm row items-center gap-xs no-wrap overflow-auto">
        <q-btn 
          dense
          flat 
          round 
          :color="isRecording ? 'red' : 'grey-7'" 
          :icon="isRecording ? 'mic_off' : 'keyboard_voice'"
          @click="toggleSpeechRecognition"
        >
          <q-tooltip>Suara ke Teks (Mic)</q-tooltip>
        </q-btn>

        <q-btn 
          dense
          flat 
          round 
          color="grey-7" 
          icon="audio_file"
          @click="triggerAudioUpload"
        >
          <q-tooltip>Upload File Audio (.mp3)</q-tooltip>
        </q-btn>

        <q-btn 
          dense
          flat 
          round 
          color="grey-7" 
          icon="image"
          @click="triggerImageUpload"
        >
          <q-tooltip>Upload Gambar Masakan</q-tooltip>
        </q-btn>

        <q-btn 
          dense
          flat 
          round 
          color="grey-7" 
          icon="description"
          @click="triggerDocUpload"
        >
          <q-tooltip>Upload Dokumen Resep</q-tooltip>
        </q-btn>
        
        <input 
          type="file" 
          ref="audioInput" 
          accept="audio/*" 
          style="display: none" 
          @change="handleAudioUploaded"
        />
        <input 
          type="file" 
          ref="imageInput" 
          accept="image/*" 
          style="display: none" 
          @change="handleImageUploaded"
        />
        <input 
          type="file" 
          ref="docInput" 
          accept=".pdf,.doc,.docx,.txt" 
          style="display: none" 
          @change="handleDocUploaded"
        />

        <q-input
          v-model="inputMessage"
          dense
          outlined
          placeholder="Tanya resep / langkah masak..."
          class="col"
          @keyup.enter="sendTextMessage"
        />

        <q-btn flat round color="primary" icon="send" @click="sendTextMessage" />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useQuasar } from 'quasar';
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
  border-radius: 16px;
  overflow: hidden;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
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
    border-radius: 0;
  }
}

.chat-messages {
  background-color: #f7f9fa;
  flex: 1;
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
</style>