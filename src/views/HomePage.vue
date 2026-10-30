<template>
  <ion-page>
    <ion-header>
      <ion-toolbar :class="warnaHeader">
        <ion-title class="header-title">Prakiraan Cuaca Jakarta</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="container">
        <div class="hero-card">
          <div class="hero-top">
            <span class="hero-label">Cuaca Saat Ini</span>
            <span class="hero-time">{{ loading ? 'Memuat data...' : sekarang ? sekarang.tanggal + ' · ' + sekarang.jam + ' GMT' : 'Data belum tersedia' }}</span>
            <span class="hero-time" v-if="sekarang">= {{ sekarang.tanggalWib }} · {{ sekarang.jamWib }} WIB</span>
            <span class="hero-time" v-if="sekarang">Waktu sekarang: {{ waktuSekarang }} WIB</span>
          </div>

          <div class="hero-main">
            <span class="hero-temp">{{ sekarang ? sekarang.suhu.toFixed(1) : '--' }}</span>
            <span class="hero-unit">°C</span>
          </div>

          <div class="chip-wrap" v-if="sekarang">
            <span :class="['chip', kelasSuhu(sekarang.suhu)]">{{ labelSuhu(sekarang.suhu) }}</span>
          </div>

          <div class="hero-stats">
            <div class="stat">
              <span class="stat-label">Tertinggi</span>
              <span class="stat-value">{{ ringkasan ? ringkasan.max.toFixed(1) + '°' : '-' }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Terendah</span>
              <span class="stat-value">{{ ringkasan ? ringkasan.min.toFixed(1) + '°' : '-' }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Rata-rata</span>
              <span class="stat-value">{{ ringkasan ? ringkasan.avg.toFixed(1) + '°' : '-' }}</span>
            </div>
          </div>

          <p class="stat-note" v-if="ringkasan">Ringkasan untuk 24 jam ke depan</p>
          <p class="hero-source" v-if="sekarang">Data prakiraan dari Open-Meteo API</p>

          <div v-if="error" class="error-box">
            <p class="error-text">{{ error }}</p>
            <ion-button size="small" @click="ambilData">Coba lagi</ion-button>
          </div>
        </div>

        <h2 class="list-title" v-if="listData.length">Data Suhu per Jam</h2>
        <p class="list-note" v-if="listData.length">Waktu utama mengikuti data API (GMT), disertai padanan WIB. Baris berwarna adalah suhu saat ini.</p>

        <div class="list-card" v-if="listData.length">
          <div :class="['list-row', { aktif: sekarang && item.time === sekarang.time }]" v-for="item in listData" :key="item.time">
            <div class="row-left">
              <span class="row-time">{{ item.tanggal }} · {{ item.jam }} GMT</span>
              <span class="row-wib">= {{ item.tanggalWib }} · {{ item.jamWib }} WIB</span>
            </div>
            <span :class="['row-temp', kelasSuhu(item.suhu)]">{{ item.suhu.toFixed(1) }}°C</span>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonContent,IonHeader, IonPage, IonTitle, IonToolbar, IonButton } from '@ionic/vue';
import { defineComponent } from 'vue';
import EndPointAccess from '@/services/EndPointAccess';

interface DataJam {
  time: string;
  suhu: number;
  tanggal: string;
  jam: string;
  tanggalWib: string;
  jamWib: string;
}

const JUMLAH_LIST = 24;
const JUMLAH_RINGKASAN = 24;

function buatDataJam(time: string, suhu: number): DataJam {
  const d = new Date(time + ':00Z');
  const opsiTanggal: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
  return {
    time,
    suhu,
    tanggal: d.toLocaleDateString('id-ID', {...opsiTanggal, timeZone: 'UTC'}),
    jam: time.substring(11,16),
    tanggalWib: d.toLocaleDateString('id-ID', {...opsiTanggal, timeZone: 'Asia/Jakarta'}),
    jamWib: d
      .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })
      .replace('.', ':')
  };
}

export default defineComponent({
  name: 'HomePage',
  data() {
    return {
      items: [] as DataJam[],
      idxSekarang: 0,
      waktuSekarang: '',
      loading: true,
      error: ''
    };
  },

  computed: {
    sekarang(): DataJam | null {
      return this.items.length ? this.items[this.idxSekarang] : null;
    },
    listData(): DataJam[] {
      return this.items.slice(0, JUMLAH_LIST);
    },
    warnaHeader(): string {
      return this.sekarang ? 'header-' + this.kelasSuhu(this.sekarang.suhu) : 'header-netral';
    },
    ringkasan(): {max: number; min: number; avg: number } | null {
      const data = this.items.slice(this.idxSekarang, this.idxSekarang + JUMLAH_RINGKASAN).map(i => i.suhu);
      if (!data.length) return null;
      return {
        max: Math.max(...data),
        min: Math.min(...data),
        avg: data.reduce((a, b) => a + b, 0) / data.length
      };
    }
  },
  mounted() {
    this.ambilData();
  },
  methods: {
    kelasSuhu(suhu: number): string {
      if(suhu >= 32) return 'panas';
      if(suhu >= 28) return 'hangat';
      return 'sejuk';
    },
    labelSuhu(suhu: number): string {
      if(suhu >= 32) return 'Panas';
      if(suhu >= 28) return 'Hangat';
      return 'Sejuk';
    },
    async ambilData() {
      this.loading = true;
      this.error = '';
      try {
        const api = new EndPointAccess( 
          'https://api.open-meteo.com/v1/forecast?latitude=-6.2&longitude=106.8&hourly=temperature_2m');
        const response = await api.getRes();
        const hourly = response.data.hourly;

        this.items = hourly.time.map((t: string, i: number) => buatDataJam(t, hourly.temperature_2m[i]));

        const now = Date.now();
        let idx = 0;
        this.items.forEach((it, i) => {
          if (new Date(it.time + ':00Z').getTime() <= now) idx = i;
        });
        this.idxSekarang = idx;

        this.waktuSekarang = new Date()
        .toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta'})
        .replace('.', ':');
      } catch (e) {
       this.error = 'Gagal mengambil data. Periksa koneksi internet.';
      } finally {
        this.loading = false;
      }
    }
  },
  components: { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton}
});
</script>

<style scoped>
.header-title {
  font-size: 22px !important;
  font-weight: bold;
}
ion-content {
  --background: #f4f5f8 !important;
}
.container {
  padding: 16px;
}

.panas { color: #e8590c; }
.hangat { color: #f08c00; }
.sejuk { color: #1c7ed6; }

ion-toolbar {
  transition: background 0.3s;
}
.header-sejuk {
  --background: #1c7ed6;
  --color: #ffffff;
}
.header-hangat {
  --background: #f08c00;
  --color: #ffffff;
}
.header-panas {
  --background: #e8590c;
  --color: #ffffff;
}
.header-netral {
  --background: #ffffff;
  --color: #222222;
}
.hero-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
}
.hero-top {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
  gap: 4px;
}
.hero-label {
  font-size: 16px;
  font-weight: 600;
  color: #222;
}
.hero-time {
  font-size: 13px;
  color: #8c8c8c;
}
.hero-main {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
}
.hero-temp {
  font-size: 72px;
  line-height: 1;
  font-weight: 400;
  color: #111;
}
.hero-unit {
  font-size: 28px;
  margin-top: 6px;
  color: #111;
}
.chip-wrap {
  margin-bottom: 16px;
}
.chip {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: #f1f3f5;
  font-size: 13px;
  font-weight: 600;
}
.hero-stats {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-label {
  font-size: 14px;
  color: #8c8c8c;
}
.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #222;
}
.stat-note {
  font-size: 13px;
  color: #8c8c8c;
  margin: 0 0 8px;
}
.hero-source {
  font-size: 12px;
  color: #8c8c8c;
  margin: 0;
}
.error-box {
  margin-top: 12px;
}
.error-text {
  color: #d33;
  font-size: 13px;
  margin: 0 0 8px;
}

.list-title {
  font-size: 16px;
  font-weight: 600;
  color: #222;
  margin: 0 0 4px 4px;
}
.list-note {
  font-size: 12px;
  color: #8c8c8c;
  margin: 0 0 12px 4px;
}
.list-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}
.list-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #eee;
}
.list-row:last-child {
  border-bottom: none;
}
.list-row.aktif {
  background: #fff4e6;
}
.row-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.row-time {
  font-size: 15px;
  color: #222;
}
.row-wib {
  font-size: 12px;
  color: #8c8c8c;
}
.row-temp {
  font-size: 18px;
  font-weight: 600;
}
</style>