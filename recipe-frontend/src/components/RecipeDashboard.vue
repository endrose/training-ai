<template>
  <q-page padding class="recipe-page">
    <div class="header-container text-center q-mb-xl q-mt-md">
      <div class="header-box">
        <span class="icon-fork q-mr-sm">🍴</span>
        <h1 class="text-h3 text-weight-bolder header-title">AI RECIPE ASSISTANT</h1>
        <span class="icon-fork q-ml-sm">🍴</span>
      </div>
    </div>

    <div class="row q-col-gutter-lg q-mb-xl categories-container">
      <div 
        v-for="region in regions" 
        :key="region.id" 
        class="col-12 col-sm-4"
      >
        <q-card 
          flat 
          class="region-card cursor-pointer"
          :class="['card-' + region.color, { 'active-card': selectedRegion === region.id }]"
          @click="selectRegion(region.id)"
        >
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
        <div 
          class="col-6 col-sm-4 col-md-3"
          v-for="recipe in getRecipes(selectedRegion)" 
          :key="recipe.name"
        >
          <q-card flat class="recipe-card text-center q-pa-md cursor-pointer">
            <div class="text-h3 q-mb-md">{{ recipe.icon }}</div>
            <div class="text-subtitle1 text-weight-bolder recipe-title">{{ recipe.name }}</div>
          </q-card>
        </div>
      </div>
    </div>

    <!-- Floating Chat Button via Component -->
    <RecipeChatbot :current-region="selectedRegion" />
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import RecipeChatbot from 'components/RecipeChatbot.vue';

interface Region {
  id: string;
  name: string;
  english: string;
  icon: string;
  desc: string;
  color: string;
}

const selectedRegion = ref<string>('nusantara');

const regions = ref<Region[]>([
  { id: 'barat', name: 'BARAT', english: 'WESTERN DISHES', icon: '🍔', desc: 'Beef Stew, Pasta', color: 'blue' },
  { id: 'timur-tengah', name: 'TIMUR TENGAH', english: 'MIDDLE EAST', icon: '🌯', desc: 'Beef Stew, Pasta', color: 'orange' },
  { id: 'nusantara', name: 'NUSANTARA', english: 'INDONESIAN', icon: '🍢', desc: 'Beef Stew, Pasta', color: 'lime' }
]);

const recipesMap: Record<string, {name: string, icon: string}[]> = {
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
