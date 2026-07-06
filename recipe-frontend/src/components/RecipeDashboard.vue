<template>
  <q-page padding class="recipe-page">
    <div class="header-container text-center q-mb-xl q-mt-md">
      <div class="header-box">
        <span class="icon-fork q-mr-sm">🍴</span>
        <h1 class="text-h3 text-weight-bolder header-title">AI RECIPE ASSISTANT</h1>
        <span class="icon-fork q-ml-sm">🍴</span>
      </div>
    </div>

    <div class="row justify-center q-mb-lg">
      <q-btn class="recipe-book-btn" no-caps color="primary" icon="menu_book" label="BUKU RESEP"
        @click="openRecipeBook" />
    </div>

    <div class="row q-col-gutter-lg q-mb-xl categories-container">
      <div v-for="region in regions" :key="region.id" class="col-12 col-sm-4">
        <q-card flat class="region-card cursor-pointer"
          :class="['card-' + region.color, { 'active-card': selectedRegion === region.id }]"
          @click="selectRegion(region.id)">
          <q-card-section class="text-center q-pa-lg">
            <div class="text-h1 q-mb-sm icon-emoji">{{ region.icon }}</div>
            <div class="text-h5 text-weight-bolder">{{ region.name }}</div>
            <div class="text-caption text-weight-bold" style="font-size: 14px;">{{ region.desc }}</div>
            <div class="text-subtitle1 text-weight-bold q-mt-sm">{{ region.english }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div v-if="selectedRegion" class="recipe-results-section q-mt-xl">
      <div class="row q-col-gutter-lg">
        <div class="col-6 col-sm-4 col-md-3" v-for="recipe in getRecipes(selectedRegion)" :key="recipe.name">
          <q-card flat class="recipe-card text-center q-pa-md cursor-pointer">
            <div class="text-h3 q-mb-md">{{ recipe.icon }}</div>
            <div class="text-subtitle1 text-weight-bolder recipe-title">{{ recipe.name }}</div>
          </q-card>
        </div>
      </div>
    </div>

    <!-- Modal Buku Resep -->
    <q-dialog v-model="showRecipeBook">
      <q-card class="recipe-book-dialog">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bolder">📖 Buku Resep</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-sm">
          <div v-if="isLoadingBook" class="text-center q-pa-lg">
            <q-spinner-dots color="primary" size="2em" />
          </div>

          <div v-else-if="bookError" class="text-negative text-center q-pa-md">
            {{ bookError }}
          </div>

          <div v-else-if="recipeBookEntries.length === 0" class="text-center text-grey q-pa-md">
            Belum ada resep yang tersimpan.
          </div>

          <q-list v-else bordered separator>
            <q-expansion-item v-for="(entry, index) in recipeBookEntries" :key="index"
              :label="getDisplayQuestion(entry)" :caption="formatTimestamp(entry.Timestamp)"
              header-class="text-weight-bold">
              <q-card>
                <q-card-section>
               
                  <div class="chat-text-markdown" v-html="renderMarkdown(entry.Output)"></div>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Floating Chat Button via Component -->
    <RecipeChatbot :current-region="selectedRegion" />
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import RecipeChatbot from 'components/RecipeChatbot.vue';
import api from '../services/api';

interface Region {
  id: string;
  name: string;
  english: string;
  icon: string;
  desc: string;
  color: string;
}

interface RecipeBookEntry {
  Timestamp?: string;
  Endpoint?: string;
  Prompt?: string;
  Output?: string;
  'File Name'?: string;
  Error?: string;
}

const selectedRegion = ref<string>('nusantara');
const showRecipeBook = ref<boolean>(false);
const isLoadingBook = ref<boolean>(false);
const bookError = ref<string>('');
const recipeBookEntries = ref<RecipeBookEntry[]>([]);

const regions = ref<Region[]>([
  { id: 'barat', name: 'BARAT', english: 'WESTERN DISHES', icon: '🍔', desc: 'Beef Stew, Pasta', color: 'blue' },
  { id: 'timur-tengah', name: 'TIMUR TENGAH', english: 'MIDDLE EAST', icon: '🌯', desc: 'Beef Stew, Pasta', color: 'orange' },
  { id: 'nusantara', name: 'NUSANTARA', english: 'INDONESIAN', icon: '🍢', desc: 'Beef Stew, Pasta', color: 'lime' }
]);

const recipesMap: Record<string, { name: string, icon: string }[]> = {
  'nusantara': [
    { name: 'SATAY KACANG (ID)', icon: '🍢' },
    { name: 'BEEF RENDANG', icon: '🍛' },
    { name: 'SOTO AYAM', icon: '🍲' },
    { name: 'NASI GORENG', icon: '🥘' }
  ],
  'barat': [
    { name: 'PASTA CARBONARA', icon: '🍝' },
    { name: 'BEEF STEW', icon: '🍲' },
    { name: 'CHEESEBURGER', icon: '🍔' },
    { name: 'HOTDOG', icon: '🌭' }
  ],
  'timur-tengah': [
    { name: 'KEBAB', icon: '🥙' },
    { name: 'SHAWARMA', icon: '🌯' },
    { name: 'FALAFEL', icon: '🧆' },
    { name: 'HUMMUS', icon: '🥣' }
  ]
};

const selectRegion = (regionId: string): void => {
  selectedRegion.value = regionId;
};

const getRecipes = (regionId: string) => {
  return recipesMap[regionId] || [];
};

// Markdown renderer untuk output AI (sama seperti di chatbot) supaya
// bold/list/heading dari Gemini tampil rapi di buku resep juga.
const md = new MarkdownIt({ breaks: true, linkify: true });
const renderMarkdown = (text?: string): string => {
  const rawHtml = md.render(text ?? '');
  return DOMPurify.sanitize(rawHtml);
};

// Format timestamp ISO jadi format tanggal-jam yang lebih mudah dibaca (locale Indonesia)
const formatTimestamp = (timestamp?: string): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;
  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

// Prompt yang tersimpan berisi teks mentah lengkap, contoh:
// "Context Kategori Kulinari: nusantara. Pertanyaan: saya mau resep nasi
// goreng mengkudu. Jawab dengan singkat, ramah, dan format yang rapi."
// Fungsi ini mengekstrak hanya bagian pertanyaan aslinya, supaya judul
// entry di buku resep bersih dan enak dibaca, tidak menampilkan prompt
// instruksi internal ke AI.
const extractQuestion = (prompt?: string): string | null => {
  if (!prompt) return null;

  const match = prompt.match(/Pertanyaan:\s*(.*?)(?:\.\s*Jawab dengan|$)/is);
  if (match && match[1]) {
    return match[1].trim();
  }

  return prompt;
};

// Tentukan label yang ditampilkan sebagai judul entry buku resep:
// prioritas pertanyaan hasil ekstraksi > nama file yang diupload > fallback nomor urut.
const getDisplayQuestion = (entry: RecipeBookEntry): string => {
  const question = extractQuestion(entry.Prompt);
  if (question) return question;
  if (entry['File Name']) return `📎 ${entry['File Name']}`;
  return 'Resep tanpa judul';
};

// Ambil data buku resep dari backend (`/api/recipe-book`), yang di baliknya
// mengambil dari Google Sheet AI-RECIPE via Apps Script.
const fetchRecipeBook = async (): Promise<void> => {
  isLoadingBook.value = true;
  bookError.value = '';

  try {
    const response = await api.get('/recipe-book');
    recipeBookEntries.value = response.data.output || [];
  } catch (error: any) {
    bookError.value = error.response?.data?.error || 'Gagal memuat buku resep.';
  } finally {
    isLoadingBook.value = false;
  }
};

const openRecipeBook = (): void => {
  showRecipeBook.value = true;
  fetchRecipeBook();
};
</script>

<style scoped>
.recipe-page {
  max-width: 1000px;
  margin: 0 auto;
  font-family: 'Arial Black', Impact, sans-serif;
  color: black;
  background-color: #fcfcfc;
  background-image:
    linear-gradient(#e5e5e5 1px, transparent 1px),
    linear-gradient(90deg, #e5e5e5 1px, transparent 1px);
  background-size: 50px 50px;
  min-height: 100vh;
}

.header-container {
  display: flex;
  justify-content: center;
}

.header-box {
  display: inline-flex;
  align-items: center;
  background: white;
  border: 4px solid black;
  padding: 10px 30px;
  box-shadow: 6px 6px 0px black;
}

.header-title {
  margin: 0;
  font-size: 2rem;
  letter-spacing: 2px;
  color: black;
}

.recipe-book-btn {
  border: 3px solid black;
  border-radius: 0;
  font-weight: 900;
  box-shadow: 4px 4px 0px black;
  transition: transform 0.1s;
}

.recipe-book-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px black;
}

.recipe-book-dialog {
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
}

.chat-text-markdown {
  font-size: 14px;
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

.region-card {
  border: 4px solid black;
  border-radius: 0;
  box-shadow: 8px 8px 0px black;
  transition: transform 0.1s;
}

.region-card:active {
  transform: translate(4px, 4px);
  box-shadow: 4px 4px 0px black;
}

.card-blue {
  background-color: #2940ff;
  color: black;
}

.card-orange {
  background-color: #ff5e00;
  color: black;
}

.card-lime {
  background: linear-gradient(135deg, #a8ff5c, #5cffb3);
  color: black;
}

.active-card {
  transform: translate(4px, 4px);
  box-shadow: 4px 4px 0px black;
}

.icon-emoji {
  filter: drop-shadow(2px 2px 0px black);
}

.recipe-card {
  border: 3px solid black;
  border-radius: 0;
  box-shadow: 4px 4px 0px black;
  background: white;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: black;
}

.recipe-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0px black;
}

.recipe-title {
  font-size: 14px;
  line-height: 1.2;
}

.ai-chat-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background-color: #ff5e00;
  border: 4px solid black;
  border-radius: 0;
  padding: 15px;
  box-shadow: 6px 6px 0px black;
  z-index: 1000;
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