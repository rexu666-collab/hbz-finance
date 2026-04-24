# HBZ Finance

Kişisel Finans Yönetim Uygulaması - Her yerden erişilebilen, gerçek zamanlı senkronizasyonlu, modern arayüzlü mali durum takip sistemi.

## Özellikler

- **Kimlik Doğrulama**: Kullanıcı adı ve şifre ile güvenli giriş
- **Dashboard**: Net varlık özeti, grafikler, son işlemler
- **Hesaplarım**: Banka hesapları, kredi kartları, krediler, nakit, yatırımlar
- **İşlemler**: Gelir/gider/transfer takibi, kategorilendirme
- **Fon Portföyü**: TEFAS yatırım fonları (AFT, MAC, TTE vb.), arama, fiyat güncelleme
- **Döviz & Altın**: TCMB anlık kurları, gram/çeyrek/tam altın
- **Gerçek Zamanlı Sync**: Telefondan eklenen veri PC'de anında görünür
- **Koyu/Açık Tema**: Kişiselleştirilebilir arayüz
- **Çoklu Kullanıcı**: İsteğe bağlı çoklu kullanıcı desteği

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| State & API | TanStack Query + Supabase |
| Grafikler | Recharts |
| Backend | Supabase (Auth + PostgreSQL + Realtime) |
| Hosting | Vercel |

## Kurulum Adımları

### 1. Supabase Yapılandırması

1. [Supabase](https://supabase.com) hesabınıza giriş yapın
2. Mevcut "HBZ Finance" projenizi açın
3. **SQL Editor**'a gidin
4. `supabase/migrations/001_setup.sql` dosyasının içeriğini kopyalayıp çalıştırın
5. `supabase/migrations/002_seed_funds.sql` dosyasının içeriğini kopyalayıp çalıştırın
6. **Project Settings > API** bölümüne gidin:
   - `Project URL` ve `anon public` key bilgilerini kopyalayın

### 2. Ortam Değişkenleri

Proje klasöründe `.env` dosyası oluşturun:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. GitHub Repo Oluşturma

Terminalde şu komutları çalıştırın:

```bash
# GitHub'a giriş yapın
gh auth login

# Repo oluşturun
gh repo create hbz-finance --public --source=. --push
```

### 4. Vercel Deploy

1. [Vercel](https://vercel.com)'e `....@gmail.com` ile kaydolun
2. "Add New Project" > "Import Git Repository"
3. GitHub hesabınızı bağlayın ve `hbz-finance` reposunu seçin
4. Framework Preset: **Vite**
5. Environment Variables bölümüne ekleyin:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. "Deploy" butonuna tıklayın

## Admin Kullanıcısı

Uygulama açıldığında kayıt olabilir veya admin hesabı ile giriş yapabilirsiniz:

- **Kullanıcı adı**: 
- **Şifre**: 

## Fon Fiyatı Güncelleme

### Manuel Güncelleme
1. Fonlar sayfasına gidin
2. Her fonun yanındaki "Güncelle" butonuna tıklayın
3. Yeni fiyatı girin

### TCMB Kurları Güncelleme
1. Dashboard veya Hesaplarım sayfasına gidin
2. Kur güncelleme butonunu kullanın (otomatik TCMB XML çekme)

## Proje Yapısı

```
hbz-finance/
├── src/
│   ├── components/     # UI bileşenleri
│   ├── contexts/       # React Context'ler (Auth, Theme)
│   ├── hooks/          # TanStack Query hook'ları
│   ├── lib/            # Yardımcı fonksiyonlar, Supabase client
│   ├── pages/          # Sayfa bileşenleri
│   ├── types/          # TypeScript tipleri
│   ├── App.tsx         # Router
│   └── main.tsx        # Entry point
├── supabase/
│   └── migrations/     # SQL migration dosyaları
└── index.html
```

## Geliştirme

```bash
# Bağımlılıkları kur
npm install

# Geliştirme sunucusu
npm run dev

# Derleme
npm run build
```

## Önemli Notlar

- **TEFAS API**: Resmi API olmadığı için fon fiyatları manuel veya kazıma ile güncellenir
- **Veri Güvenliği**: Row Level Security (RLS) ile her kullanıcı sadece kendi verisini görür
- **Ücretsiz Limitler**: Supabase (500MB) ve Vercel (sınırsız bant genişliği) ücretsiz planları kişisel kullanım için yeterlidir

## Lisans

Kişisel kullanım için tasarlanmıştır.
