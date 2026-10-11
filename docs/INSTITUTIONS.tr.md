# 🏫 Kurumlar için rehber

[English](INSTITUTIONS.md) · **Türkçe**

Üniversitelerin ve LMS yöneticilerinin Mcp4Lms ile nasıl birlikte çalışabileceğini, kendi
kopyalarını nasıl çalıştırabileceğini veya nasıl hariç tutulma talep edebileceğini açıklar.
Mcp4Lms deneysel, kâr amacı gütmeyen ve gönüllülerce yürütülen bir projedir; hiçbir ücret talep etmez.

| Konu | İletişim |
|---|---|
| İş birliği, hariç tutulma, kaldırma talepleri ve diğer sorular | [maintainers@mcp4lms.com](mailto:maintainers@mcp4lms.com) |
| Güvenlik zafiyetleri ve güvenlik olayları | [security@mcp4lms.com](mailto:security@mcp4lms.com) (gizli; asla herkese açık bir issue olarak değil) |

## 🧭 Yol seçin

| Amacınız | Yol |
|---|---|
| Öğrencilere resmî ve yönetilen bir entegrasyon sunmak | [🤝 Birlikte çalışma](#-birlikte-çalışma) |
| Hizmeti kendiniz çalıştırmak ve yönetmek | [🏢 Kendi sunucunuzda çalıştırma](#-kendi-sunucunuzda-çalıştırma) |
| Mcp4Lms'in LMS'inizle çalışmasını durdurmak | [🚫 Hariç tutulma talebi](#-hariç-tutulma-talebi) |
| Güvenlik zafiyeti bildirmek | Güvenlik adresine yazın. Bunu bir hariç tutulma talebine eklemeyin. |

Birlikte çalışmayı tercih ederiz. Çoğu durumda kapsamı belirlenmiş resmî bir entegrasyon, endişeleri
doğrudan engellemekten daha iyi karşılar.

## 🤝 Birlikte çalışma

Amaç: yer imini, kurumunuzun kontrol ettiği resmî ve onaya dayalı bir yolla değiştirmek.

1. **İletişime geçin.** Kurumunuzu, LMS adresinizi ve sürece dâhil olan ekibi (BT, hukuk, veri
   koruma) belirtin.
2. **Kapsamı birlikte belirleyin.** Genellikle ele alınan konular:
   - [ ] LMS'inizde kayıtlı bir istemci ve yer imi yerine standart OAuth
   - [ ] İzin verilen veriler ve izin kapsamları
   - [ ] Öğrenci onay ekranı ve metni
   - [ ] Erişim kayıtları ve saklama süresi
   - [ ] Yapay zekâ aracı politikası ve hangi araçların etkin olduğu
   - [ ] Kurumunuzun gerektirdiği hukuki sözleşmeler
3. **Pilot uygulama** yapın; küçük bir öğrenci grubuyla başlayın.
4. **Yaygınlaştırın** ve entegrasyonu resmî bir kaynak olarak duyurun.

İş birliği, gönüllülerin o dönemdeki uygunluğuna bağlıdır ve garanti edilmez.

## 🏢 Kendi sunucunuzda çalıştırma

Amaç: kurumunuz tarafından yönetilen kendi kopyanızı çalıştırmak.

1. Bu depoyu fork'layın, yani kopyalayıp değiştirin.
2. [Deploying your own instance](../README.md#-deploying-your-own-instance) adımlarını izleyin.
3. Yayına almadan önce kontrol edin:
   - [ ] `LMS_URL` ve `PUBLIC_URL` sizin LMS'inizi ve alan adınızı gösteriyor
   - [ ] Metinlerde ve `security.txt` dosyasında bizim iletişim adreslerimizin yerine sizinkiler yer alıyor
   - [ ] Gizlilik sayfası, açtığınız kayıtlar dâhil, hizmeti nasıl işlettiğinizi doğru anlatıyor
   - [ ] Ağ üzerinden sunulan hizmetler için [AGPL-3.0](../LICENSE) lisansının gerektirdiği şekilde,
     kaynak koddaki değişiklikleriniz kullanıcılarınıza sunuluyor

Gönüllüler talep üzerine, uygunluklarına göre yardımcı olabilir.

## 🚫 Hariç tutulma talebi

### Ne göndermelisiniz

Geliştiricilere şunları içeren bir e-posta gönderin:

- [ ] Resmî bir kurum e-posta alan adından gönderilmiş olması
- [ ] Kurum adı ve LMS adresi
- [ ] Adınız ve göreviniz (örneğin BT, hukuk, veri koruma)
- [ ] Endişeleriniz ve dayandığınız politika veya hukuki gerekçeler
- [ ] Talep onaylanırsa yayımlanabileceğine dair onay ya da bir [istisnanın](#yayımlama) neden
  geçerli olduğu
- [ ] Takip için bir iletişim kişisi

### Talebi nasıl ele alırız

1. **Alındığını bildiririz.**
2. **Doğrularız:** gönderenin alan adını ve görevini kontrol ederiz.
3. **İnceleriz:** endişeleri değerlendiririz ve alternatif olarak bir iş birliği önerebiliriz.
4. **Karar verir** ve şu yanıtlardan biriyle döneriz:
   - Onaylandı
   - Alternatif önerildi
   - Gerekçesiyle reddedildi

Talep göndermek tek başına hariç tutulmayı garanti etmez.

### Talep onaylanırsa

- [ ] Kurum, barındırılan sürümdeki üniversite listesinden kaldırılır
- [ ] Barındırılan sürümde o LMS'e ait hesaplar silinir ve uygulama bağlantıları iptal edilir
- [ ] LMS adresi bu depodaki engelleme listesine eklenir; böylece kendi sunucusunda çalıştırılan
  kopyalar bu kurumla varsayılan olarak çalışmaz
- [ ] Bir istisna geçerli değilse talep, duyuru olarak yayımlanır

### Yayımlama

Onaylanan kaldırma talepleri çok sayıda öğrenciyi etkiler; bu nedenle şeffaflık için bunları
projenin herkese açık kanallarında yayımlarız. Lütfen taleplerinizi gizli olmayan bir yazışma
olarak gönderin.

Şu konuları içeren talepleri yayımlamayız:

- Kanıtlanmış bir gizlilik sorunu
- Bir güvenlik zafiyeti veya güvenlik olayı
- Yeni keşfedilen bir güvenlik veya tasarım kusuru
