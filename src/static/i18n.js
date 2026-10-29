/* Bahasa Melayu for the interface. app.js keeps writing English; this file swaps each text
   node (and placeholder, title and aria-label) for its BM version when BM is on, and keeps the
   English so the switch can go back. Test questions, O*NET skill names, course titles and AI
   text stay in English. Loaded before app.js. */
"use strict";

const LANG_KEY = "future-skills-lang";
let LANG = (() => { try { return localStorage.getItem(LANG_KEY) === "ms" ? "ms" : "en"; } catch (e) { return "en"; } })();

const AREAS_MS = {
  "Cloud, Infrastructure & Networking": "Awan, Infrastruktur & Rangkaian",
  "IT Management & Analysis": "Pengurusan & Analisis IT",
  "Web & Interface Design": "Reka Bentuk Web & Antara Muka",
  "Software Engineering": "Kejuruteraan Perisian",
  "Cybersecurity": "Keselamatan Siber",
  "Data & AI": "Data & AI",
};
const ROLES_MS = {
  "Software Developers": "Pembangun Perisian",
  "Computer Programmers": "Pengatur Cara Komputer",
  "Software Quality Assurance Analysts and Testers": "Penganalisis dan Penguji Jaminan Kualiti Perisian",
  "Blockchain Engineers": "Jurutera Blockchain",
  "Data Scientists": "Saintis Data",
  "Computer and Information Research Scientists": "Saintis Penyelidikan Komputer dan Maklumat",
  "Business Intelligence Analysts": "Penganalisis Risikan Perniagaan",
  "Database Administrators": "Pentadbir Pangkalan Data",
  "Database Architects": "Arkitek Pangkalan Data",
  "Data Warehousing Specialists": "Pakar Gudang Data",
  "Information Security Analysts": "Penganalisis Keselamatan Maklumat",
  "Penetration Testers": "Penguji Penembusan",
  "Digital Forensics Analysts": "Penganalisis Forensik Digital",
  "Information Security Engineers": "Jurutera Keselamatan Maklumat",
  "Network and Computer Systems Administrators": "Pentadbir Rangkaian dan Sistem Komputer",
  "Computer Network Architects": "Arkitek Rangkaian Komputer",
  "Computer Network Support Specialists": "Pakar Sokongan Rangkaian Komputer",
  "Computer User Support Specialists": "Pakar Sokongan Pengguna Komputer",
  "Computer Systems Engineers/Architects": "Jurutera/Arkitek Sistem Komputer",
  "Web Developers": "Pembangun Web",
  "Web and Digital Interface Designers": "Pereka Antara Muka Web dan Digital",
  "Video Game Designers": "Pereka Permainan Video",
  "Web Administrators": "Pentadbir Web",
  "Computer Systems Analysts": "Penganalisis Sistem Komputer",
  "Information Technology Project Managers": "Pengurus Projek Teknologi Maklumat",
  "Computer and Information Systems Managers": "Pengurus Sistem Komputer dan Maklumat",
};
const SDG_MS = {
  "Good Health and Well-being": "Kesihatan Baik dan Kesejahteraan",
  "Quality Education": "Pendidikan Berkualiti",
  "Decent Work and Economic Growth": "Pekerjaan Wajar dan Pertumbuhan Ekonomi",
  "Industry, Innovation and Infrastructure": "Industri, Inovasi dan Infrastruktur",
  "Reduced Inequalities": "Mengurangkan Ketidaksamaan",
  "Responsible Consumption and Production": "Penggunaan dan Pengeluaran Bertanggungjawab",
  "Peace, Justice and Strong Institutions": "Keamanan, Keadilan dan Institusi Kukuh",
  "Partnerships for the Goals": "Perkongsian untuk Matlamat",
};

// Exact text, keyed by the English with spaces collapsed.
const MS = {
  // header, footer, steps
  "Skills": "Kemahiran", "Interests": "Minat", "IT Test": "Ujian IT", "Matches": "Padanan", "Trends": "Trend",
  "Your CV": "CV anda", "Skills test": "Ujian kemahiran", "Your jobs": "Kerjaya anda", "(done)": "(selesai)",
  "Data:": "Data:", "All profiles shown are fictional. Full list in SOURCES.md.": "Semua profil yang dipaparkan adalah rekaan. Senarai penuh dalam SOURCES.md.",
  "(CC BY 4.0, modified by the team; USDOL/ETA has not approved or endorsed it),": "(CC BY 4.0, diubah suai oleh pasukan; USDOL/ETA tidak meluluskan atau menyokongnya),",
  // errors
  "Cannot reach the Future Skills server. It may have stopped or be restarting.": "Tidak dapat menghubungi pelayan Future Skills. Ia mungkin terhenti atau sedang dimulakan semula.",
  "Try again": "Cuba lagi", "Back to start": "Kembali ke permulaan",
  // home
  "Future-ready careers for IT students": "Kerjaya masa depan untuk pelajar IT",
  "Find the part of IT that suits you, and the job to aim for.": "Cari bidang IT yang sesuai dengan anda, dan kerjaya yang patut disasarkan.",
  "Future Skills combines your CV, an interest questionnaire and a short IT skills test to show which of 6 IT areas fits you best, then ranks 26 IT roles, explains every score, shows the skills you still need, and links each role to the UN Sustainable Development Goals.":
    "Future Skills menggabungkan CV anda, soal selidik minat dan ujian kemahiran IT yang ringkas untuk menunjukkan bidang IT yang paling sesuai daripada 6 bidang, kemudian menyusun 26 peranan IT, menerangkan setiap skor, menunjukkan kemahiran yang masih perlu, dan mengaitkan setiap peranan dengan Matlamat Pembangunan Mampan (SDG) PBB.",
  "Optional. Upload it, or rate your skills instead. About 1 minute.": "Pilihan. Muat naik CV, atau nilai kemahiran anda sendiri. Kira-kira 1 minit.",
  "Your interests": "Minat anda",
  "36 quick statements about IT work you would enjoy. About 8 minutes.": "36 kenyataan ringkas tentang kerja IT yang anda minati. Kira-kira 8 minit.",
  "Only the 3 to 6 IT areas your CV and interests point to, with code you run in the browser.": "Hanya 3 hingga 6 bidang IT yang ditunjukkan oleh CV dan minat anda, termasuk kod yang dijalankan dalam pelayar.",
  "Grouped by what you enjoy and what you can do: ranked roles, the skills you still need and free courses.": "Disusun mengikut apa yang anda minati dan apa yang anda mampu: senarai peranan, kemahiran yang masih perlu dan kursus percuma.",
  "Every step is optional and you can go back any time; the more you do, the better the result.": "Setiap langkah adalah pilihan dan anda boleh kembali bila-bila masa; lebih banyak anda lakukan, lebih tepat hasilnya.",
  "Continue where I left off": "Sambung dari tempat saya berhenti", "Start: step 1, your CV": "Mula: langkah 1, CV anda",
  "Try the demo student (fictional)": "Cuba pelajar demo (rekaan)", "Try the demo student": "Cuba pelajar demo",
  "See the AI-trend data": "Lihat data trend AI",
  "Test questions, O*NET skill names, course titles and AI-written text stay in English, as in most IT workplaces.":
    "Soalan ujian, nama kemahiran O*NET, tajuk kursus dan teks tulisan AI kekal dalam bahasa Inggeris, seperti di kebanyakan tempat kerja IT.",
  // interests intro
  "What kind of work do you actually enjoy?": "Kerja jenis apa yang anda benar-benar minati?",
  "36 items": "36 item", "About 8 minutes": "Kira-kira 8 minit", "Skip any time": "Boleh langkau bila-bila masa",
  "Why": "Kenapa", "How it is used": "Cara ia digunakan", "Your data": "Data anda",
  "Finds the kind of IT work you enjoy most: building, analysing, designing, helping, leading or organising, and which of the 6 IT areas it points to.":
    "Mencari jenis kerja IT yang paling anda minati: membina, menganalisis, mereka bentuk, membantu, memimpin atau mengatur, dan bidang IT mana daripada 6 bidang yang ditunjukkannya.",
  "Your top 3 interest areas are always in your skills test, so the test checks what you care about. In your results, interest and skill together decide which areas' jobs come first.":
    "3 bidang minat teratas anda sentiasa dimasukkan dalam ujian kemahiran, jadi ujian menyemak apa yang anda minati. Dalam keputusan, minat dan kemahiran bersama-sama menentukan kerjaya bidang mana yang didahulukan.",
  "Answers stay in this browser tab and are only used to compute your matches.": "Jawapan kekal dalam tab pelayar ini dan hanya digunakan untuk mengira padanan anda.",
  "Each item starts with \"I would enjoy...\". Say how much you agree, based on what you would enjoy, not what you are already good at.":
    "Setiap item bermula dengan \"Saya akan seronok...\". Nyatakan sejauh mana anda bersetuju, berdasarkan apa yang anda akan seronok lakukan, bukan apa yang anda sudah mahir.",
  "Continue questionnaire": "Sambung soal selidik", "Start questionnaire": "Mula soal selidik",
  "Skip to step 3: the skills test": "Langkau ke langkah 3: ujian kemahiran",
  "Questions written by the team, based on Holland's RIASEC interest types as used by": "Soalan ditulis oleh pasukan, berdasarkan jenis minat RIASEC Holland seperti yang digunakan oleh",
  // interest items
  "← Back": "← Kembali", "Pause": "Jeda", "I would enjoy...": "Saya akan seronok...",
  "Strongly disagree": "Sangat tidak setuju", "Disagree": "Tidak setuju", "Not sure": "Tidak pasti", "Agree": "Setuju", "Strongly agree": "Sangat setuju",
  "Questions written by the team, based on Holland's RIASEC types as used by O*NET (USDOL/ETA). Not an official O*NET instrument.":
    "Soalan ditulis oleh pasukan, berdasarkan jenis RIASEC Holland seperti yang digunakan oleh O*NET (USDOL/ETA). Bukan instrumen rasmi O*NET.",
  "Taking apart an old computer to see how the parts fit together.": "Membuka komputer lama untuk melihat bagaimana bahagiannya dipasang.",
  "Finding out why a program keeps crashing by testing different ideas.": "Mencari punca sesuatu program asyik ranap dengan menguji pelbagai idea.",
  "Designing a logo, icon or poster on the computer.": "Mereka logo, ikon atau poster di komputer.",
  "Helping a classmate who is stuck with their computer or phone.": "Membantu rakan sekelas yang menghadapi masalah dengan komputer atau telefon mereka.",
  "Leading a group project and making sure it finishes on time.": "Memimpin projek berkumpulan dan memastikan ia siap tepat pada masanya.",
  "Setting passwords and access rights so only the right people can open each file.": "Menetapkan kata laluan dan hak akses supaya hanya orang yang betul boleh membuka setiap fail.",
  "Training a simple model that predicts something, like exam results from study hours.": "Melatih model ringkas yang meramal sesuatu, seperti keputusan peperiksaan berdasarkan jam belajar.",
  "Explaining a technical idea in simple words to someone who is not into tech.": "Menerangkan idea teknikal dengan perkataan mudah kepada orang yang tidak meminati teknologi.",
  "Writing tests that check my code still works after every change.": "Menulis ujian yang menyemak kod saya masih berfungsi selepas setiap perubahan.",
  "Choosing colours, fonts and layouts that make an app look attractive.": "Memilih warna, fon dan susun atur yang menjadikan aplikasi kelihatan menarik.",
  "Setting up a Wi-Fi router and connecting network cables at home or school.": "Memasang penghala Wi-Fi dan menyambung kabel rangkaian di rumah atau sekolah.",
  "Pitching an app idea and convincing others to support it.": "Membentangkan idea aplikasi dan meyakinkan orang lain untuk menyokongnya.",
  "Sketching how a new app screen could look before anyone builds it.": "Melakar rupa skrin aplikasi baharu sebelum sesiapa membinanya.",
  "Starting my own tech company one day.": "Memulakan syarikat teknologi sendiri suatu hari nanti.",
  "Installing an operating system (like Windows or Linux) on a laptop from scratch.": "Memasang sistem pengendalian (seperti Windows atau Linux) pada komputer riba dari awal.",
  "Checking a program or spreadsheet carefully for small mistakes.": "Menyemak program atau hamparan dengan teliti untuk mencari kesilapan kecil.",
  "Studying a large set of data to discover hidden patterns.": "Mengkaji set data yang besar untuk menemui corak tersembunyi.",
  "Interviewing people to understand the problems they face with an app.": "Menemu bual orang untuk memahami masalah yang mereka hadapi dengan sesuatu aplikasi.",
  "Giving a short talk to warn classmates about scam links and phishing.": "Memberi ceramah ringkas untuk memberi amaran kepada rakan sekelas tentang pautan penipuan dan pancingan data (phishing).",
  "Entering, sorting and cleaning up data in a spreadsheet.": "Memasukkan, menyusun dan membersihkan data dalam hamparan.",
  "Learning how a search engine or recommendation system decides what to show.": "Mempelajari bagaimana enjin carian atau sistem cadangan memutuskan apa yang dipaparkan.",
  "Deciding which features a product should have first.": "Memutuskan ciri mana yang patut ada dahulu dalam sesuatu produk.",
  "Creating animations, short videos or characters for a game.": "Mencipta animasi, video pendek atau watak untuk permainan.",
  "Fixing a device that stopped working by testing it step by step.": "Membaiki peranti yang rosak dengan mengujinya langkah demi langkah.",
  "Meeting clients to find out what they want and agreeing on a deal.": "Berjumpa pelanggan untuk mengetahui kehendak mereka dan mencapai persetujuan.",
  "Building a gaming PC or small server from separate parts.": "Membina PC permainan atau pelayan kecil daripada komponen berasingan.",
  "Teaching older family members how to use apps safely.": "Mengajar ahli keluarga yang lebih tua cara menggunakan aplikasi dengan selamat.",
  "Reading about how hackers break into systems and how to stop them.": "Membaca tentang cara penggodam menceroboh sistem dan cara menghalang mereka.",
  "Writing clear instructions or guides that others can follow.": "Menulis arahan atau panduan yang jelas untuk diikuti orang lain.",
  "Coming up with an original idea for a game or website.": "Mencetuskan idea asli untuk permainan atau laman web.",
  "Making sure a system follows rules, policies and security standards.": "Memastikan sesuatu sistem mematuhi peraturan, dasar dan piawaian keselamatan.",
  "Making a personal website that shows my own style.": "Membina laman web peribadi yang menunjukkan gaya saya sendiri.",
  "Organising a coding competition or tech event at school.": "Menganjurkan pertandingan pengekodan atau acara teknologi di sekolah.",
  "Working with real equipment in a server room, not only at a desk.": "Bekerja dengan peralatan sebenar di bilik pelayan, bukan hanya di meja.",
  "Building technology that makes life easier for people with disabilities.": "Membina teknologi yang memudahkan hidup orang kurang upaya.",
  "Running experiments to compare which solution works faster.": "Menjalankan eksperimen untuk membandingkan penyelesaian mana yang lebih pantas.",
  // interest results
  "Your interest code (Holland code)": "Kod minat anda (kod Holland)",
  "Which IT areas you would enjoy": "Bidang IT yang anda akan minati",
  "From the 4 questions about each area (0–100).": "Daripada 4 soalan tentang setiap bidang (0–100).",
  "Scores for the six interest types": "Skor bagi enam jenis minat", "Your three strongest interests": "Tiga minat terkuat anda",
  "This is a direction, not a verdict. Interests change with experience. In your matches they sit next to the skills test and your CV.":
    "Ini satu arah, bukan keputusan muktamad. Minat berubah dengan pengalaman. Dalam padanan anda, minat digunakan bersama ujian kemahiran dan CV anda.",
  "Next: step 3, the skills test": "Seterusnya: langkah 3, ujian kemahiran", "Answer again": "Jawab semula",
  "Type descriptions written by the team, based on": "Penerangan jenis ditulis oleh pasukan, berdasarkan",
  "Realistic": "Realistik", "Investigative": "Penyiasat", "Artistic": "Artistik", "Social": "Sosial", "Enterprising": "Keusahawanan", "Conventional": "Konvensional",
  "Hands-on work with tools, machines, materials or living things, often outdoors or in workshops: engineering, electronics, construction, agriculture.":
    "Kerja amali dengan alat, mesin, bahan atau benda hidup, selalunya di luar atau di bengkel: kejuruteraan, elektronik, pembinaan, pertanian.",
  "Studying and solving problems with ideas, data and research: science, medicine, mathematics, statistics and information technology.":
    "Mengkaji dan menyelesaikan masalah dengan idea, data dan penyelidikan: sains, perubatan, matematik, statistik dan teknologi maklumat.",
  "Creating designs, media, writing, music or performances, and applying artistic ideas to products and interfaces.":
    "Mencipta reka bentuk, media, penulisan, muzik atau persembahan, dan menerapkan idea seni pada produk dan antara muka.",
  "Helping, teaching, counselling or caring for people: education, health care and community services.":
    "Membantu, mengajar, memberi kaunseling atau menjaga orang: pendidikan, penjagaan kesihatan dan perkhidmatan komuniti.",
  "Leading, persuading, selling and managing: business, marketing, finance, management and law.":
    "Memimpin, memujuk, menjual dan mengurus: perniagaan, pemasaran, kewangan, pengurusan dan undang-undang.",
  "Organising information and following clear procedures: administration, accounting, data, IT operations and finance.":
    "Mengatur maklumat dan mengikut prosedur yang jelas: pentadbiran, perakaunan, data, operasi IT dan kewangan.",
  "Every answer is the same, so the questionnaire cannot tell your interests apart. It is left out of your matches.":
    "Semua jawapan sama, jadi soal selidik tidak dapat membezakan minat anda. Ia tidak digunakan dalam padanan anda.",
  "Your interest in the six IT areas is very even. You may still be exploring: treat this part of the result as a light hint.":
    "Minat anda dalam enam bidang IT sangat sekata. Anda mungkin masih meneroka: anggap bahagian keputusan ini sebagai petunjuk ringan sahaja.",
  // skills page
  "What can you already do?": "Apa yang anda sudah mampu lakukan?",
  "Fastest: upload your CV.": "Paling pantas: muat naik CV anda.",
  "AI reads it and ticks the technologies you use; then check the list below.": "AI membacanya dan menandakan teknologi yang anda guna; kemudian semak senarai di bawah.",
  "Upload my CV": "Muat naik CV saya",
  "Or rate what you know below; anything left at “–” counts as not yet learned. Scale: 1 Basic · 2 Some · 3 Good · 4 Strong · 5 Expert.":
    "Atau nilai apa yang anda tahu di bawah; apa-apa yang dibiarkan pada “–” dikira belum dipelajari. Skala: 1 Asas · 2 Sedikit · 3 Baik · 4 Kukuh · 5 Pakar.",
  "Highest education (finished or about to finish)": "Pendidikan tertinggi (sudah tamat atau hampir tamat)",
  "Diploma": "Diploma", "Bachelor's degree": "Ijazah sarjana muda", "Master's degree or higher": "Ijazah sarjana atau lebih tinggi",
  "General skills": "Kemahiran umum", "Knowledge areas": "Bidang pengetahuan",
  "Skills used in most jobs, rated by O*NET for each role. Similar skills are grouped together.": "Kemahiran yang digunakan dalam kebanyakan pekerjaan, dinilai oleh O*NET bagi setiap peranan. Kemahiran yang serupa dikumpulkan bersama.",
  "Subjects you have studied or worked with.": "Subjek yang pernah anda pelajari atau gunakan dalam kerja.",
  "Technologies you use": "Teknologi yang anda guna", "Search technologies": "Cari teknologi", "e.g. Python, SQL, Figma": "cth. Python, SQL, Figma",
  "Next: step 2, interests": "Seterusnya: langkah 2, minat",
  "None": "Tiada", "Basic": "Asas", "Some": "Sedikit", "Good": "Baik", "Strong": "Kukuh", "Expert": "Pakar",
  "Communication": "Komunikasi", "Reading, writing, listening and speaking": "Membaca, menulis, mendengar dan bertutur",
  "Maths and science": "Matematik dan sains", "Using maths and scientific methods to solve problems": "Menggunakan matematik dan kaedah saintifik untuk menyelesaikan masalah",
  "Problem solving": "Penyelesaian masalah", "Critical thinking, complex problems, judgement and decisions": "Pemikiran kritis, masalah kompleks, pertimbangan dan keputusan",
  "Learning and teaching": "Belajar dan mengajar", "Picking up new things fast and teaching others": "Cepat mempelajari perkara baharu dan mengajar orang lain",
  "Working with people": "Bekerja dengan orang", "Reading people, coordinating with others, helping customers": "Memahami orang, berkoordinasi dengan orang lain, membantu pelanggan",
  "Persuading and negotiating": "Memujuk dan berunding", "Changing minds and reaching agreements": "Mengubah pendapat orang dan mencapai persetujuan",
  "Programming and design": "Pengaturcaraan dan reka bentuk", "Writing code, designing technology, working out what users need": "Menulis kod, mereka bentuk teknologi, mengenal pasti keperluan pengguna",
  "Systems and quality": "Sistem dan kualiti", "Analysing and evaluating systems, monitoring performance, testing quality": "Menganalisis dan menilai sistem, memantau prestasi, menguji kualiti",
  "Running and watching systems": "Mengendalikan dan memantau sistem", "Operating systems and watching how they perform": "Mengendalikan sistem dan memantau prestasinya",
  "Troubleshooting and repair": "Penyelesaian masalah teknikal dan pembaikan", "Finding faults, maintaining and fixing equipment": "Mencari kerosakan, menyelenggara dan membaiki peralatan",
  "Managing time, money and people": "Mengurus masa, wang dan orang", "Planning time, budgets, materials and staff": "Merancang masa, bajet, bahan dan kakitangan",
  "Business and management": "Perniagaan dan pengurusan", "Running organisations, office administration, HR": "Mengurus organisasi, pentadbiran pejabat, sumber manusia",
  "Finance and economics": "Kewangan dan ekonomi", "Accounting, banking, economics": "Perakaunan, perbankan, ekonomi",
  "Sales and customer service": "Jualan dan khidmat pelanggan", "Marketing, selling, serving customers": "Pemasaran, jualan, melayan pelanggan",
  "Computers and telecoms": "Komputer dan telekomunikasi", "Hardware, software, networks, telecommunications": "Perkakasan, perisian, rangkaian, telekomunikasi",
  "Engineering and mechanics": "Kejuruteraan dan mekanik", "Engineering, technology and machines": "Kejuruteraan, teknologi dan mesin",
  "Mathematics": "Matematik", "Maths knowledge: algebra, statistics, calculus": "Pengetahuan matematik: algebra, statistik, kalkulus",
  "Psychology": "Psikologi", "How people think, learn and behave": "Cara orang berfikir, belajar dan berkelakuan",
  "Education and training": "Pendidikan dan latihan", "Teaching and designing training": "Mengajar dan mereka bentuk latihan",
  "Language, media and design": "Bahasa, media dan reka bentuk", "English, media and design": "Bahasa Inggeris, media dan reka bentuk",
  "Law and public safety": "Undang-undang dan keselamatan awam", "Law, government, security": "Undang-undang, kerajaan, keselamatan",
  // CV page
  "Let AI read your CV": "Biar AI membaca CV anda",
  "Upload your CV to get a short summary of your skills and qualifications. The IT areas it shows evidence for are checked in your skills test, so the test stays short.":
    "Muat naik CV anda untuk mendapatkan ringkasan kemahiran dan kelayakan anda. Bidang IT yang ada bukti dalam CV akan disemak dalam ujian kemahiran, jadi ujian kekal ringkas.",
  "Choose your CV": "Pilih CV anda", "PDF, Word (.docx) or text, up to 2 MB": "PDF, Word (.docx) atau teks, sehingga 2 MB",
  "Try a sample CV (fictional)": "Cuba CV contoh (rekaan)",
  "Your CV is sent to our server and, when AI is on, to Fireworks AI to write the summary. It is not saved. Leave out your IC number, address and phone if you prefer.":
    "CV anda dihantar ke pelayan kami dan, apabila AI aktif, ke Fireworks AI untuk menulis ringkasan. Ia tidak disimpan. Anda boleh buang nombor IC, alamat dan telefon jika mahu.",
  "No CV? Rate your skills instead": "Tiada CV? Nilai kemahiran anda sendiri", "Skip this step": "Langkau langkah ini",
  "Summary": "Ringkasan", "Qualifications": "Kelayakan", "Use it for your matches": "Guna untuk padanan anda",
  "No skills found.": "Tiada kemahiran ditemui.", "No degree, diploma or certificate found.": "Tiada ijazah, diploma atau sijil ditemui.",
  "Technologies found by matching words in your CV against the app's list (O*NET In Demand technologies), not by AI. Untick anything that is wrong.":
    "Teknologi ditemui dengan memadankan perkataan dalam CV anda dengan senarai aplikasi (teknologi O*NET In Demand), bukan oleh AI. Nyahtanda apa-apa yang salah.",
  "None of the tracked technologies were found.": "Tiada teknologi yang dijejak ditemui.",
  "Set highest education to": "Tetapkan pendidikan tertinggi kepada", "Add to my skills": "Tambah ke kemahiran saya",
  "You still rate the general skills yourself.": "Anda masih perlu menilai kemahiran umum sendiri.",
  "AI summary not available right now, so this summary lists what our matcher found in your CV.": "Ringkasan AI tidak tersedia sekarang, jadi ringkasan ini menyenaraikan apa yang ditemui oleh pemadan kami dalam CV anda.",
  "Evidence per IT area": "Bukti bagi setiap bidang IT",
  "No evidence found: AI could not read it right now and none of the tracked technologies are in your CV. Your matches use your test and questionnaire instead.":
    "Tiada bukti ditemui: AI tidak dapat membacanya sekarang dan tiada teknologi yang dijejak dalam CV anda. Padanan anda menggunakan ujian dan soal selidik sebagai ganti.",
  "Your matches use these scores as your CV evidence.": "Padanan anda menggunakan skor ini sebagai bukti CV anda.",
  "Do not use them": "Jangan guna", "Not used in your matches.": "Tidak digunakan dalam padanan anda.", "Use them": "Guna",
  // results
  "Best matches for your level": "Padanan terbaik untuk tahap anda",
  "No answers yet": "Belum ada jawapan", "Do at least one of steps 1 to 3 first, or try the fictional demo student.": "Lakukan sekurang-kurangnya satu daripada langkah 1 hingga 3 dahulu, atau cuba pelajar demo rekaan.",
  "Scoring IT roles…": "Mengira skor peranan IT…", "Your matches": "Padanan anda",
  "Future scenario": "Senario masa depan",
  "These are estimates, not predictions.": "Ini anggaran, bukan ramalan.",
  "Nobody knows how fast AI will change jobs. Each scenario is a different assumption about the future, built from public data (DOSM, MyCOL, arXiv) and weights the team chose. Compare them: a role that ranks high in all three is a safer choice than one that ranks high in only one. The decision is yours.":
    "Tiada siapa tahu betapa cepat AI akan mengubah pekerjaan. Setiap senario ialah andaian berbeza tentang masa depan, dibina daripada data awam (DOSM, MyCOL, arXiv) dan pemberat yang dipilih oleh pasukan. Bandingkan senario: peranan yang berada di kedudukan tinggi dalam ketiga-tiganya ialah pilihan lebih selamat daripada yang tinggi dalam satu sahaja. Keputusan di tangan anda.",
  "Current trends": "Trend semasa", "Fast AI adoption": "Penggunaan AI pantas", "Malaysian demand leads": "Permintaan Malaysia mendahului",
  "Malaysian job demand and AI momentum count equally, as in the trend score.": "Permintaan pekerjaan Malaysia dan momentum AI dikira sama rata, seperti dalam skor trend.",
  "AI spreads quickly into every field, so how fast AI research is entering a field matters more than today's hiring.": "AI tersebar dengan cepat ke semua bidang, jadi kepantasan penyelidikan AI memasuki sesuatu bidang lebih penting daripada pengambilan pekerja hari ini.",
  "AI adoption is slow and uneven, so today's Malaysian employment growth decides which fields need people.": "Penggunaan AI perlahan dan tidak sekata, jadi pertumbuhan pekerjaan Malaysia hari ini menentukan bidang mana yang memerlukan tenaga kerja.",
  "Study time per week": "Masa belajar seminggu",
  "IT area fit": "Kesesuaian bidang IT", "Interest fit": "Kesesuaian minat", "Skill fit": "Kesesuaian kemahiran", "AI-era trend": "Trend era AI",
  "IT area fit:": "Kesesuaian bidang IT:", "Interest fit:": "Kesesuaian minat:", "Skill fit:": "Kesesuaian kemahiran:", "AI-era trend:": "Trend era AI:",
  "not scored": "tiada skor", "Show all": "Tunjuk semua",
  "Start with your own answers": "Mula dengan jawapan anda sendiri", "Change my skills": "Ubah kemahiran saya", "Take the skills test": "Ambil ujian kemahiran",
  "How the trend score works": "Cara skor trend berfungsi", "How your IT areas were scored": "Cara bidang IT anda diberi skor",
  "No roles in your best-fit areas match your education level yet. Try a higher education level on the skills page.": "Belum ada peranan dalam bidang paling sesuai anda yang sepadan dengan tahap pendidikan anda. Cuba tahap pendidikan lebih tinggi di halaman kemahiran.",
  "Best fit for you": "Paling sesuai untuk anda", "High interest and high skill: these areas' roles come first.": "Minat tinggi dan kemahiran tinggi: peranan dalam bidang ini didahulukan.",
  "You can do this, but it may not excite you": "Anda mampu, tetapi mungkin kurang berminat", "High skill, lower interest: these roles are listed after your best fit.": "Kemahiran tinggi, minat lebih rendah: peranan ini disenaraikan selepas yang paling sesuai.",
  "Want to get there?": "Mahu sampai ke sana?", "High interest, but your skills are not there yet. Not in your recommended list: here is what to learn first.": "Minat tinggi, tetapi kemahiran anda belum cukup. Tidak dalam senarai cadangan: inilah yang perlu dipelajari dahulu.",
  "Best fit for your interests · skills not checked yet": "Paling sesuai dengan minat anda · kemahiran belum disemak",
  "Best fit for your skills · interests not checked yet": "Paling sesuai dengan kemahiran anda · minat belum disemak",
  "Your IT areas are not scored yet:": "Bidang IT anda belum diberi skor:", "add your CV": "tambah CV anda", "answer the interest questions": "jawab soalan minat",
  "take the skills test": "ambil ujian kemahiran", "All roles are listed by match score below.": "Semua peranan disenaraikan mengikut skor padanan di bawah.",
  "Not shown": "Tidak ditunjukkan", "Biggest skill gaps": "Jurang kemahiran terbesar", "for its best-matching roles:": "bagi peranan yang paling sepadan:",
  "Your skills are not checked yet, so this is from your interests only.": "Kemahiran anda belum disemak, jadi ini berdasarkan minat anda sahaja.",
  "Add your CV": "Tambah CV anda", "Your interests are not checked yet, so this is from your skills only.": "Minat anda belum disemak, jadi ini berdasarkan kemahiran anda sahaja.",
  "Answer the interest questions (8 min)": "Jawab soalan minat (8 min)",
  "On MyCOL critical list": "Dalam senarai kritikal MyCOL", "Related MyCOL occupation": "Pekerjaan MyCOL berkaitan", "Other IT area": "Bidang IT lain",
  "Same rank in all 3 scenarios": "Kedudukan sama dalam ketiga-tiga senario", "The rank does not change between the three future scenarios": "Kedudukan tidak berubah antara tiga senario masa depan",
  "Needs further study": "Perlu belajar lagi", "Needs extra qualification": "Perlu kelayakan tambahan", "Licensed profession, reference only": "Profesion berlesen, rujukan sahaja", "No trend data (neutral 50)": "Tiada data trend (neutral 50)",
  "How to get there: learning path →": "Cara ke sana: laluan pembelajaran →", "Why this score, and what to learn": "Kenapa skor ini, dan apa yang perlu dipelajari",
  "Explain this for me": "Terangkan kepada saya", "Explain again": "Terangkan semula", "Writing a plain-language explanation…": "Sedang menulis penerangan dalam bahasa mudah…",
  "AI explanation not available right now, so this is a plain summary of your scores.": "Penerangan AI tidak tersedia sekarang, jadi ini ringkasan mudah skor anda.",
  "You meet the level O*NET lists for every rated skill of this role.": "Anda mencapai tahap yang disenaraikan O*NET bagi setiap kemahiran yang dinilai untuk peranan ini.",
  "Technologies to learn": "Teknologi untuk dipelajari", "See the full learning path, with videos": "Lihat laluan pembelajaran penuh, dengan video",
  "Loading role details…": "Memuatkan butiran peranan…", "Could not load role details.": "Tidak dapat memuatkan butiran peranan.",
  "Licences and certifications": "Lesen dan pensijilan", "required to practise in Malaysia": "wajib untuk berkhidmat di Malaysia", "O*NET occupation:": "Pekerjaan O*NET:",
  "Your learning path": "Laluan pembelajaran anda", "Ordered by the biggest gap first; all free.": "Disusun mengikut jurang terbesar dahulu; semuanya percuma.",
  "self-paced, no stated length": "ikut kadar sendiri, tiada tempoh dinyatakan", "self-paced": "ikut kadar sendiri", "Free": "Percuma",
  "Your plan was re-checked with new trend data": "Pelan anda telah disemak semula dengan data trend baharu",
  "Learning paths below now follow the new ranking.": "Laluan pembelajaran di bawah kini mengikut kedudukan baharu.", "Nothing in your ranking changed.": "Tiada perubahan dalam kedudukan anda.",
  // trends
  "AI-era trend signals": "Isyarat trend era AI",
  "Which IT areas does Malaysia need, and how fast is AI entering them?": "Bidang IT mana yang diperlukan Malaysia, dan betapa cepat AI memasukinya?",
  "These signals describe the recent past; they do not predict the future.": "Isyarat ini menggambarkan masa lalu terdekat; ia tidak meramal masa depan.",
  "Each one compares 1 to 4 data points, so the trend scores built from them are estimates. See the confidence of each signal below, and the three future scenarios on your jobs page.":
    "Setiap satu membandingkan 1 hingga 4 titik data, jadi skor trend daripadanya ialah anggaran. Lihat tahap keyakinan setiap isyarat di bawah, dan tiga senario masa depan di halaman kerjaya anda.",
  "Malaysian demand:": "Permintaan Malaysia:", "AI momentum:": "Momentum AI:", "· AI momentum:": "· Momentum AI:", "Malaysian demand": "Permintaan Malaysia", "AI momentum": "Momentum AI",
  "no data": "tiada data",
  "Each signal has a direction (up or on MyCOL = +1; flat, near or not on MyCOL = 0) and a confidence (high, medium, low). Each part = 50 + 50 × the confidence-weighted average direction.":
    "Setiap isyarat ada arah (naik atau dalam MyCOL = +1; mendatar, hampir atau tiada dalam MyCOL = 0) dan tahap keyakinan (tinggi, sederhana, rendah). Setiap bahagian = 50 + 50 × purata arah berpemberat keyakinan.",
  ": MyCOL coverage of the area, DOSM online ads where DOSM has a series, and, for a role, whether it is on MyCOL.":
    ": liputan MyCOL bagi bidang itu, iklan dalam talian DOSM jika DOSM ada siri data, dan, bagi sesuatu peranan, sama ada ia dalam MyCOL.",
  ": growth in AI papers in the area's arXiv categories. Trend score = 50% demand + 50% AI momentum; a part with no data is left out, never estimated. The weights are team choices; the future scenarios on the Matches page change them.":
    ": pertumbuhan kertas AI dalam kategori arXiv bidang itu. Skor trend = 50% permintaan + 50% momentum AI; bahagian tanpa data ditinggalkan, tidak pernah dianggarkan. Pemberat ini pilihan pasukan; senario masa depan di halaman Padanan mengubahnya.",
  "Update data": "Kemas kini data",
  "Fetches the latest OpenDOSM figures (and optionally arXiv, about 2 minutes), then recomputes the signals and scores. If a source fails, its previous data is kept.":
    "Mengambil angka OpenDOSM terkini (dan arXiv jika dipilih, kira-kira 2 minit), kemudian mengira semula isyarat dan skor. Jika sesuatu sumber gagal, data sebelumnya dikekalkan.",
  "Also refresh arXiv paper counts": "Juga kemas kini bilangan kertas arXiv", "Update data now": "Kemas kini data sekarang", "Updating…": "Sedang mengemas kini…",
  "Update failed; previous data kept.": "Kemas kini gagal; data sebelumnya dikekalkan.",
  "Signals by IT area": "Isyarat mengikut bidang IT", "ICT sector background (not scored)": "Latar belakang sektor ICT (tiada skor)", "All input data with sources": "Semua data input dengan sumber",
  "For": "Untuk", "Signal": "Isyarat", "Direction": "Arah", "Confidence": "Keyakinan", "Detail": "Butiran", "Entity": "Entiti", "Metric": "Metrik", "Value": "Nilai", "Period": "Tempoh", "Source": "Sumber",
  "composition effect": "kesan komposisi",
  "Limits: DOSM publishes ads for only one IT occupation (Software Developers), MyCOL is one edition (a status, not a trend), and arXiv is global. Where AI papers grew only because all papers grew, the signal is marked \"composition effect\".":
    "Had: DOSM menerbitkan iklan bagi satu pekerjaan IT sahaja (Pembangun Perisian), MyCOL hanya satu edisi (status, bukan trend), dan arXiv bersifat global. Jika kertas AI bertambah hanya kerana semua kertas bertambah, isyarat ditanda \"kesan komposisi\".",
  // test
  "Can you do the work in the areas that fit you?": "Bolehkah anda melakukan kerja dalam bidang yang sesuai dengan anda?",
  "1 · Quick check": "1 · Semakan pantas", "2 · In depth": "2 · Mendalam", "3 · Your result": "3 · Keputusan anda",
  "Your 2 strongest of these get 2 harder questions and 1 hands-on task each: write code or SQL, analyse logs, or plan a project.":
    "2 bidang terkuat anda mendapat 2 soalan lebih sukar dan 1 tugasan amali setiap satu: menulis kod atau SQL, menganalisis log, atau merancang projek.",
  "These areas ranked for you, a readiness score for your top 2, the skills to work on, and an explanation for every answer.":
    "Bidang ini disusun untuk anda, skor kesediaan bagi 2 teratas, kemahiran untuk diperbaiki, dan penerangan bagi setiap jawapan.",
  "Code runs in your browser, in Python. The first coding question downloads Python (about 10 MB) once.": "Kod dijalankan dalam pelayar anda, dalam Python. Soalan pengekodan pertama memuat turun Python (kira-kira 10 MB) sekali sahaja.",
  "See your last result": "Lihat keputusan terakhir anda", "Start a new test": "Mula ujian baharu", "Start the test": "Mula ujian", "Skip to step 4, my jobs": "Langkau ke langkah 4, kerjaya saya",
  "Quick check": "Semakan pantas", "In depth": "Mendalam", "Hands-on": "Amali",
  "Select all that apply.": "Pilih semua yang berkenaan.", "Your answer": "Jawapan anda", "Your Python code": "Kod Python anda", "Run tests": "Jalankan ujian",
  "Tables and data": "Jadual dan data", "Your SQL query (SQLite)": "Pertanyaan SQL anda (SQLite)", "Run query": "Jalankan pertanyaan", "No rows": "Tiada baris",
  "Showing the first 50 rows.": "Menunjukkan 50 baris pertama.", "Running…": "Sedang dijalankan…", "Loading Python (first time only)…": "Memuatkan Python (kali pertama sahaja)…",
  "Pass": "Lulus", "Fail": "Gagal", "gave": "memberi", "Not allowed:": "Tidak dibenarkan:",
  "See my result": "Lihat keputusan saya", "Continue to in-depth questions": "Teruskan ke soalan mendalam", "Next": "Seterusnya",
  "Running your tests…": "Sedang menjalankan ujian anda…", "Finding your strongest areas…": "Sedang mencari bidang terkuat anda…", "Scoring…": "Sedang mengira skor…",
  "These questions go deeper.": "Soalan ini lebih mendalam.", "Your strongest areas so far:": "Bidang terkuat anda setakat ini:",
  "Extra quick check:": "Semakan pantas tambahan:", "Your earlier answers stay as they are.": "Jawapan awal anda kekal.",
  "Want to test your other IT areas?": "Mahu menguji bidang IT anda yang lain?",
  // test result
  "/ 100 readiness": "/ 100 kesediaan", "Area score": "Skor bidang", "Jobs in this area (O*NET):": "Pekerjaan dalam bidang ini (O*NET):",
  "Job-ready": "Sedia bekerja", "Developing": "Sedang berkembang", "Foundation": "Asas",
  "An indicative self-check of job-entry skills, not a certification or a hiring decision.": "Semakan kendiri indikatif bagi kemahiran permulaan kerja, bukan pensijilan atau keputusan pengambilan.",
  "Share my result": "Kongsi keputusan saya", "Link copied": "Pautan disalin",
  "Anyone with this link sees your IT profile, top 2 areas and skills to work on; the page does not show your answers, but the link itself carries them (that is how the result is rebuilt), so share it only with people you choose. Nothing is saved on our server.":
    "Sesiapa yang ada pautan ini boleh melihat profil IT anda, 2 bidang teratas dan kemahiran untuk diperbaiki; halaman tidak menunjukkan jawapan anda, tetapi pautan itu sendiri membawanya (begitulah keputusan dibina semula), jadi kongsikan hanya dengan orang pilihan anda. Tiada apa-apa disimpan di pelayan kami.",
  "Your IT profile": "Profil IT anda", "Their IT profile": "Profil IT mereka",
  "Quick-check score in each tested area (0–100): the same number of questions per area, so you can compare them. Your top 2 (bold) were then tested in depth.":
    "Skor semakan pantas bagi setiap bidang yang diuji (0–100): bilangan soalan yang sama bagi setiap bidang, jadi anda boleh membandingkannya. 2 teratas anda (tebal) kemudian diuji secara mendalam.",
  "Quick-check score in each tested area (0–100): the same number of questions per area. Their top 2 (bold) were then tested in depth.":
    "Skor semakan pantas bagi setiap bidang yang diuji (0–100): bilangan soalan yang sama bagi setiap bidang. 2 teratas mereka (tebal) kemudian diuji secara mendalam.",
  "Your top 2, tested in depth": "2 teratas anda, diuji secara mendalam", "Their top 2, tested in depth": "2 teratas mereka, diuji secara mendalam",
  "Readiness counts the in-depth and hands-on questions in that area. Your strongest area has the highest area score; an area seen only in the quick check is never ranked above these two, here or on your jobs page. Right answers also count as skills in your job matches.":
    "Kesediaan mengira soalan mendalam dan amali dalam bidang itu. Bidang terkuat anda mempunyai skor bidang tertinggi; bidang yang hanya dilihat dalam semakan pantas tidak akan disusun di atas dua bidang ini, di sini atau di halaman kerjaya anda. Jawapan betul juga dikira sebagai kemahiran dalam padanan kerjaya anda.",
  "Skills to work on": "Kemahiran untuk diperbaiki", "Skills they are working on": "Kemahiran yang sedang mereka perbaiki", "Nothing: every answer was right.": "Tiada: semua jawapan betul.",
  "Next: step 4, your jobs.": "Seterusnya: langkah 4, kerjaya anda.",
  "Your areas grouped by what you enjoy and what you can do, with ranked roles and the skills you still need.": "Bidang anda disusun mengikut apa yang anda minati dan apa yang anda mampu, dengan senarai peranan dan kemahiran yang masih perlu.",
  "Next: step 4, my jobs": "Seterusnya: langkah 4, kerjaya saya", "Add your CV (1 min)": "Tambah CV anda (1 min)", "Do step 2, interests (8 min)": "Buat langkah 2, minat (8 min)",
  "Review every answer": "Semak setiap jawapan", "Take a new test": "Ambil ujian baharu", "Home": "Laman utama",
  "Right": "Betul", "Partly right": "Separa betul", "Wrong": "Salah", "Not answered.": "Tidak dijawab.", "Answer:": "Jawapan:", "Source:": "Sumber:",
  "Passes every test (see the explanation)": "Lulus semua ujian (lihat penerangan)",
  "Shared IT skills test result": "Keputusan ujian kemahiran IT yang dikongsi", "Loading the shared result…": "Memuatkan keputusan yang dikongsi…",
  "Which part of IT suits you?": "Bidang IT mana yang sesuai dengan anda?", "A free skills test in the IT areas your CV and interests point to.": "Ujian kemahiran percuma dalam bidang IT yang ditunjukkan oleh CV dan minat anda.",
  "Take the IT skills test": "Ambil ujian kemahiran IT", "What is Future Skills?": "Apakah Future Skills?",
  "This share link does not work": "Pautan kongsi ini tidak berfungsi", "It may be cut off, or made with an older version of the test.": "Ia mungkin terpotong, atau dibuat dengan versi ujian yang lebih lama.",
  // learning path
  "Building the learning path…": "Sedang membina laluan pembelajaran…", "← Back to my jobs": "← Kembali ke kerjaya saya", "Back to my jobs": "Kembali ke kerjaya saya",
  "Learning path": "Laluan pembelajaran", "What the job involves (O*NET)": "Apa yang dilakukan dalam pekerjaan ini (O*NET)",
  "Everything here is free. We opened every link and checked its title, channel and length; videos open on YouTube in a new tab.":
    "Semua di sini percuma. Kami telah membuka setiap pautan dan menyemak tajuk, saluran dan tempohnya; video dibuka di YouTube dalam tab baharu.",
  "Start here: the basics every student in this area needs.": "Mula di sini: asas yang diperlukan setiap pelajar dalam bidang ini.",
  "Courses aimed at this exact job.": "Kursus khusus untuk pekerjaan ini.", "Close your skill gaps": "Tutup jurang kemahiran anda", "Skills and tools this job uses": "Kemahiran dan alat yang digunakan dalam pekerjaan ini",
  "Your biggest gaps for this role, with where to learn each one. Skills you have not rated yet come last;": "Jurang terbesar anda bagi peranan ini, dengan tempat untuk mempelajari setiap satu. Kemahiran yang belum dinilai disenaraikan terakhir;",
  "rate them": "nilai kemahiran itu", "to see your real gaps.": "untuk melihat jurang sebenar anda.",
  "From O*NET, tools first. Take the steps on the home page to see only the ones you are missing.": "Daripada O*NET, alat didahulukan. Ikut langkah di laman utama untuk melihat hanya yang anda belum ada.",
  "Prove it": "Buktikan", "A recognised certificate or a portfolio shows employers what you can do.": "Sijil yang diiktiraf atau portfolio menunjukkan kepada majikan apa yang anda mampu lakukan.",
  "No certification listed for this role yet. A portfolio of the projects from the courses above is the best proof.": "Belum ada pensijilan disenaraikan untuk peranan ini. Portfolio projek daripada kursus di atas ialah bukti terbaik.",
  "No checked free resource in our list yet.": "Belum ada sumber percuma yang disemak dalam senarai kami.", "Certification": "Pensijilan",
  "technology": "teknologi", "skill": "kemahiran", "Free course": "Kursus percuma", "▶ YouTube video": "▶ Video YouTube", "▶ YouTube playlist": "▶ Senarai main YouTube",
  "What this path contributes to": "Sumbangan laluan ini",
  "The UN Sustainable Development Goal targets this job serves, and the skills on this path that build them. The links are the team's judgement (data/sdg_map.csv), not UN text; hover a skill to see why.":
    "Sasaran Matlamat Pembangunan Mampan PBB yang disumbang oleh pekerjaan ini, dan kemahiran dalam laluan ini yang membinanya. Kaitan ini pertimbangan pasukan (data/sdg_map.csv), bukan teks PBB; letak tetikus pada kemahiran untuk melihat sebabnya.",
  "Working already? Courses your employer can claim": "Sudah bekerja? Kursus yang boleh dituntut majikan anda", "HRD Corp claimable": "Boleh dituntut HRD Corp",
  "Paid courses whose provider page says they are claimable under HRD Corp. Only an employer registered and paying the HRD Corp levy can claim, and it must apply before the course starts. Check with the provider and your HR first. Not part of the free plan above or its hours.":
    "Kursus berbayar yang menurut laman penyedianya boleh dituntut di bawah HRD Corp. Hanya majikan yang berdaftar dan membayar levi HRD Corp boleh menuntut, dan permohonan mesti dibuat sebelum kursus bermula. Semak dengan penyedia dan HR anda dahulu. Bukan sebahagian daripada pelan percuma di atas atau jamnya.",
};

// Area, role and SDG names inside longer text, longest first so "Data & AI" never splits a longer name.
const NAMES = Object.entries({ ...AREAS_MS, ...ROLES_MS, ...SDG_MS }).sort((a, b) => b[0].length - a[0].length);
const names = (s) => NAMES.reduce((acc, [en, ms]) => acc.split(en).join(ms), s).replace(/ and (?=[A-Z])/g, " dan ");

// Text built from numbers or names: [pattern, (match) => BM].
const PATTERNS = [
  [/^Step (\d) of 4 · (.+)$/, (m) => `Langkah ${m[1]} daripada 4 · ${tr(m[2])}`],
  [/^(.+) · demo: (.+)$/, (m) => `${tr(m[1])} · demo: ${m[2]}`],
  [/^Your CV · optional, about 1 minute$/, () => "CV anda · pilihan, kira-kira 1 minit"],
  [/^Your skills \(no CV needed\)$/, () => "Kemahiran anda (tanpa CV)"],
  [/^Your interest results$/, () => "Keputusan minat anda"],
  [/^IT skills test( result)?$/, (m) => (m[1] ? "Keputusan ujian kemahiran IT" : "Ujian kemahiran IT")],
  [/^Item (\d+) of (\d+)$/, (m) => `Item ${m[1]} daripada ${m[2]}`],
  [/^([RIASEC]) · (\w+)$/, (m) => (MS[m[2]] ? `${m[1]} · ${MS[m[2]]}` : null)],
  [/^(.+\.) Type descriptions written by the team, based on$/, (m) => `${tr(m[1])} ${MS["Type descriptions written by the team, based on"]}`],
  [/^Question (\d+) of (\d+)$/, (m) => `Soalan ${m[1]} daripada ${m[2]}`],
  [/^about (\d+) min$/, (m) => `kira-kira ${m[1]} min`],
  [/^(\d+) of (\d+) skill groups rated · (\d+) technologies$/, (m) => `${m[1]} daripada ${m[2]} kumpulan kemahiran dinilai · ${m[3]} teknologi`],
  [/^\((\d+) that O\*NET marks In Demand\)$/, (m) => `(${m[1]} yang ditanda In Demand oleh O*NET)`],
  [/^(.+) level$/, (m) => (MS[m[1]] ? `Tahap ${MS[m[1]].toLowerCase()}` : null)],
  [/^Show all (\d+) roles$/, (m) => `Tunjuk semua ${m[1]} peranan`],
  [/^Reading (.+)…$/, (m) => `Sedang membaca ${m[1] === "the sample CV" ? "CV contoh" : m[1]}…`],
  [/^Read ([\d,]+) characters from (.+)\.$/, (m) => `${m[1]} aksara dibaca daripada ${m[2] === "the sample CV" ? "CV contoh" : m[2]}.`],
  [/^Could not read the CV: (.+)$/, (m) => `Tidak dapat membaca CV: ${m[1]}`],
  [/^Could not get an explanation: (.+)$/, (m) => `Tidak dapat mendapatkan penerangan: ${m[1]}`],
  [/^Something went wrong: (.+)$/, (m) => `Ada masalah: ${m[1]}`],
  [/^Continue \((\d+) answered\)$/, (m) => `Sambung (${m[1]} dijawab)`],
  [/^Test this area too \(about (\d+) min\)$/, (m) => `Uji bidang ini juga (kira-kira ${m[1]} min)`],
  [/^Test all remaining areas \(about (\d+) min\)$/, (m) => `Uji semua bidang yang tinggal (kira-kira ${m[1]} min)`],
  [/^Your test left out (this area|these (\d+) areas)\. Add a (\d+)-question quick check for any of them: your earlier answers stay, and your result groups are worked out again with the new scores\.$/,
    (m) => `Ujian anda tidak merangkumi ${m[2] ? `${m[2]} bidang ini` : "bidang ini"}. Tambah semakan pantas ${m[3]} soalan bagi mana-mana bidang: jawapan awal anda kekal, dan kumpulan keputusan anda dikira semula dengan skor baharu.`],
  [/^(\d+) questions: 3 in each of these (\d+) areas, so each gets the same fair chance\.$/, (m) => `${m[1]} soalan: 3 bagi setiap ${m[2]} bidang ini, jadi setiap bidang mendapat peluang yang sama adil.`],
  [/^Not checked: (.+)\. They get no test score; your results use your CV and interests for them\.$/, (m) => `Tidak disemak: ${names(m[1])}. Bidang ini tiada skor ujian; keputusan anda menggunakan CV dan minat anda untuknya.`],
  [/^To focus the test, first$/, () => "Untuk memfokuskan ujian, sila"],
  [/^Not tested: (.+)\. No test score\.$/, (m) => `Tidak diuji: ${names(m[1])}. Tiada skor ujian.`],
  [/^(Your strongest|Strongest) IT area: (.+)$/, (m) => `${m[1] === "Strongest" ? "Bidang IT terkuat" : "Bidang IT terkuat anda"}: ${names(m[2])}`],
  [/^= 40% quick check \((\d+)\) \+ 60% readiness \((\d+)\)$/, (m) => `= 40% semakan pantas (${m[1]}) + 60% kesediaan (${m[2]})`],
  [/^Someone shared their Future Skills test result with you\. (.+)$/, (m) => `Seseorang berkongsi keputusan ujian Future Skills mereka dengan anda. ${tr(m[1])}`],
  [/^Quick-check score in each of your (\d+) tested IT areas: (.+) out of 100$/, (m) => `Skor semakan pantas bagi setiap ${m[1]} bidang IT yang diuji: ${names(m[2])} daripada 100`],
  [/^Summary written by AI \((.+)\) from your CV\. It can make mistakes, so check it against your CV\.$/, (m) => `Ringkasan ditulis oleh AI (${m[1]}) daripada CV anda. Ia boleh tersilap, jadi semak dengan CV anda.`],
  [/^Written by AI \((.+)\) from your scores above\. It may still be wrong; the numbers above are the source of truth\.$/, (m) => `Ditulis oleh AI (${m[1]}) daripada skor anda di atas. Ia masih boleh salah; nombor di atas ialah sumber yang betul.`],
  [/^(.+) fits you best \(area fit ([\d.]+)\)(.*)$/, (m) => `${names(m[1])} paling sesuai dengan anda (kesesuaian bidang ${m[2]})${m[3].replace(/^, a clear lead of ([\d.]+) points\.$/, ", jauh mendahului sebanyak $1 mata.").replace(/^, but only ([\d.]+) points ahead of (.+): look at both\.$/, (x, p, n) => `, tetapi hanya ${p} mata di hadapan ${names(n)}: lihat kedua-duanya.`)}`],
  [/^(\d+) of your (\d+) sources rank (.+) first(.*)$/, (m) => `${m[1]} daripada ${m[2]} sumber anda meletakkan ${names(m[3])} di tempat pertama${srcMs(m[4])}`],
  [/^Your (skills test|preferences|CV and tools) result points to (.+), but your (skills test|preferences|CV and tools) result points to (.+)\.$/, (m) => `Keputusan ${srcMs(m[1])} anda menghala ke ${names(m[2])}, tetapi keputusan ${srcMs(m[3])} anda menghala ke ${names(m[4])}.`],
  [/^Only your (skills test|preferences|CV and tools) result was used\. Add the other parts for a more reliable result\.$/, (m) => `Hanya keputusan ${srcMs(m[1])} anda digunakan. Tambah bahagian lain untuk keputusan yang lebih boleh dipercayai.`],
  // planText on the test intro
  [/ — we'll check /, (m) => planMs(m.input)],
  // results page
  [/^Match score = (\d+)% fit with the role's IT area \+ (\d+)% interest fit with the role \+ (\d+)% skill fit \+ (\d+)% AI-era trend of the role\. The weights are the team's design choice\. Roles are ranked by match score, highest first\. Roles that need a higher qualification than yours, or a professional licence, are not shown\.$/,
    (m) => `Skor padanan = ${m[1]}% kesesuaian dengan bidang IT peranan + ${m[2]}% kesesuaian minat dengan peranan + ${m[3]}% kesesuaian kemahiran + ${m[4]}% trend era AI peranan. Pemberat ini pilihan reka bentuk pasukan. Peranan disusun mengikut skor padanan, tertinggi dahulu. Peranan yang memerlukan kelayakan lebih tinggi daripada anda, atau lesen profesional, tidak ditunjukkan.`],
  [/^Each IT area is placed by your interest \(from the questionnaire\) and your skill \(your skills test and CV evidence\)\. "High" means among your top (\d+)\.$/,
    (m) => `Setiap bidang IT diletakkan mengikut minat anda (daripada soal selidik) dan kemahiran anda (ujian kemahiran dan bukti CV). "Tinggi" bermaksud dalam ${m[1]} teratas anda.`],
  [/^Your top (\d+) areas\. Their roles are listed below\.$/, (m) => `${m[1]} bidang teratas anda. Peranan bidang ini disenaraikan di bawah.`],
  [/^Trend score weights: Malaysian demand (\d+)% · AI momentum (\d+)%\. Area scores: (.+)\. An area with only one measured part keeps the same score\.$/,
    (m) => `Pemberat skor trend: permintaan Malaysia ${m[1]}% · momentum AI ${m[2]}%. Skor bidang: ${names(m[3])}. Bidang yang hanya ada satu bahagian diukur mengekalkan skor yang sama.`],
  [/^(\d+) hours$/, (m) => `${m[1]} jam`],
  [/^(\d+)\. (.+?)\s*$/, (m) => (ROLES_MS[m[2]] ? `${m[1]}. ${ROLES_MS[m[2]]} (${m[2]}) ` : null)],
  [/^(.+): how to get there$/, (m) => (ROLES_MS[m[1]] ? `${ROLES_MS[m[1]]} (${m[1]}): cara ke sana` : null)],
  [/^Learning path: (.+) →$/, (m) => `Laluan pembelajaran: ${names(m[1])} →`],
  [/^Learning path · built on your skill gaps$/, () => "Laluan pembelajaran · dibina berdasarkan jurang kemahiran anda"],
  [/^Match score ([\d.]+) out of 100$/, (m) => `Skor padanan ${m[1]} daripada 100`],
  [/^#(\d+)–(\d+) across 3 scenarios$/, (m) => `#${m[1]}–${m[2]} dalam 3 senario`],
  [/^Rank under each future scenario: (.+)$/, (m) => `Kedudukan dalam setiap senario masa depan: ${m[1].replace("baseline", "trend semasa").replace("fast ai", "AI pantas").replace("local demand", "permintaan Malaysia")}`],
  [/^([▲▼]) (\d+) vs current trends$/, (m) => `${m[1]} ${m[2]} berbanding trend semasa`],
  [/^Needs further study \(Job Zone (\d)\)$/, (m) => `Perlu belajar lagi (Job Zone ${m[1]})`],
  [/^SDG ([\d.]+) · (.+)$/, (m) => `SDG ${m[1]} · ${SDG_MS[m[2]] || m[2]}`],
  [/^([\d.–]+) \/ 100 × weight (\d+)% = ([\d.–]+) points$/, (m) => `${m[1]} / 100 × pemberat ${m[2]}% = ${m[3]} mata`],
  [/^· importance ([\d.]+)\/5$/, (m) => `· kepentingan ${m[1]}/5`],
  [/^you ([\d.–]+) → needed ([\d.–]+) \(O\*NET level, 0–7\)$/, (m) => `anda ${m[1]} → perlu ${m[2]} (tahap O*NET, 0–7)`],
  [/^· you ([\d.–]+) → needed ([\d.–]+) \(O\*NET 0–7\)$/, (m) => `· anda ${m[1]} → perlu ${m[2]} (O*NET 0–7)`],
  [/^· not rated yet, needed ([\d.–]+) \(O\*NET 0–7\)$/, (m) => `· belum dinilai, perlu ${m[1]} (O*NET 0–7)`],
  [/^· (technology|skill)( · .+)?$/, (m) => `· ${MS[m[1]]}${m[2] ? tr(m[2]) : ""}`],
  [/^· not rated yet · needed ([\d.–]+) \(O\*NET 0–7\)$/, (m) => `· belum dinilai · perlu ${m[1]} (O*NET 0–7)`],
  [/^You already use: (.+)$/, (m) => `Anda sudah guna: ${m[1]}`],
  [/^Covers: (.+)$/, (m) => `Merangkumi: ${m[1]}`],
  [/^(.+) · ([\d.]+ h|self-paced, no stated length) · (Free|RM \d+) · checked (.+)$/, (m) => `${m[1]} · ${m[2] === "self-paced, no stated length" ? MS[m[2]] : m[2].replace(" h", " jam")} · ${m[3] === "Free" ? "Percuma" : m[3]} · disemak ${m[4]}`],
  [/^(.+) · RM (\d+) · for (.+) · checked (.+)$/, (m) => `${m[1]} · RM ${m[2]} · untuk ${m[3]} · disemak ${m[4]}`],
  [/^No verified free course in our list yet for: (.+)\.$/, (m) => `Belum ada kursus percuma yang disahkan dalam senarai kami untuk: ${m[1]}.`],
  [/^Working already\? (\d+) paid courses? your employer can claim under HRD Corp (are|is) on the full learning path page\.$/, (m) => `Sudah bekerja? ${m[1]} kursus berbayar yang boleh dituntut majikan anda di bawah HRD Corp ada di halaman laluan pembelajaran penuh.`],
  [/^Foundations for (.+)$/, (m) => `Asas untuk ${names(m[1])}`],
  [/^Made for (.+)$/, (m) => `Khusus untuk ${names(m[1])}`],
  [/^(at \d+ hours a week.*?\.) (Everything here is free\..+)$/, (m) => `${tr(m[1])} ${tr(m[2])}`],
  // a resource's facts: provider · hours · cost · level (· notes)
  [/ · (?:self-paced|Free)(?: · |$)/, (m) => m.input.split(" · ").map((x, i) => (i === 0 ? x
    : { "self-paced": "ikut kadar sendiri", Free: "Percuma", beginner: "permulaan", intermediate: "pertengahan", advanced: "lanjutan" }[x]
      || x.replace(/^([\d.]+) h$/, "$1 jam"))).join(" · ")],
  [/^About$/, () => "Kira-kira"],
  [/^([\d.]+) hours$/, (m) => `${m[1]} jam`],
  [/^, or$/, () => ", atau"],
  [/^([\d.]+) weeks$/, (m) => `${m[1]} minggu`],
  [/^of free material, or$/, () => "bahan percuma, atau"],
  [/^at (\d+) hours a week(?: \(plus (\d+) self-paced resources?\))?\.$/, (m) => `pada ${m[1]} jam seminggu${m[2] ? ` (serta ${m[2]} sumber ikut kadar sendiri)` : ""}.`],
  [/^at (\d+) hours a week(?:, plus (\d+) self-paced courses?)?\.$/, (m) => `pada ${m[1]} jam seminggu${m[2] ? `, serta ${m[2]} kursus ikut kadar sendiri` : ""}.`],
  [/^Plus (\d+) more skills? without a free resource in our list yet\.$/, (m) => `Serta ${m[1]} lagi kemahiran tanpa sumber percuma dalam senarai kami.`],
  [/^This job \((\w+) link\): (.+)$/, (m) => `Pekerjaan ini (kaitan ${m[1]}): ${m[2]}`],
  [/^(Also built|Built) by (\d+) skills? on this path:$/, (m) => `${m[1] === "Built" ? "Dibina" : "Juga dibina"} oleh ${m[2]} kemahiran dalam laluan ini:`],
  [/^: rank (\d+) → (\d+)(.*)$/, (m) => `: kedudukan ${m[1]} → ${m[2]}${m[3].replace(", trend", ", trend")}`],
  [/^\(computed (.+)\)\.$/, (m) => `(dikira ${m[1]}).`],
  [/^Updated (.*)\. Your jobs page will re-check your plan with the new data\.$/, (m) => `Dikemas kini ${m[1]}. Halaman kerjaya anda akan menyemak semula pelan anda dengan data baharu.`],
  [/^No data: (.+)$/, (m) => `Tiada data: ${m[1].replace("Malaysian demand", "Permintaan Malaysia").replace("AI momentum", "Momentum AI")}`],
  [/^Malaysian demand comes from the official MyCOL 2024\/2025 critical-occupations list \(TalentCorp\) and DOSM online job ads; AI momentum from arXiv paper counts \(global research\)\. Every signal lists its source and dates\. Scores computed (.+)\.$/,
    (m) => `Permintaan Malaysia datang daripada senarai pekerjaan kritikal rasmi MyCOL 2024/2025 (TalentCorp) dan iklan kerja dalam talian DOSM; momentum AI daripada bilangan kertas arXiv (penyelidikan global). Setiap isyarat menyenaraikan sumber dan tarikhnya. Skor dikira ${m[1]}.`],
  [/^released (.+) · fetched (.+)$/, (m) => `diterbitkan ${m[1]} · diambil ${m[2]}`],
  [/^(\d+) \/ (\d+) tests passed$/, (m) => `${m[1]} / ${m[2]} ujian lulus`],
  [/^The (\d+) tests your function must pass$/, (m) => `${m[1]} ujian yang mesti diluluskan oleh fungsi anda`],
  [/^· Q(\d+) · (.+)$/, (m) => `· S${m[1]} · ${m[2]}`],
  // server text: area groups and insights
  [/^(.+\.) (Skill = .+\.)$/, (m) => `${tr(m[1])} ${tr(m[2])}`],
  [/^· (.*(?:skills test|preferences|CV and tools).*)$/, (m) => `· ${srcMs(m[1]).replace(/questions/g, "soalan").replace(/RIASEC fit/g, "kesesuaian RIASEC")}`],
  [/^Your (.+) (?:is|are both) in your top (\d+)\.|^Your .+ is in your top \d+, but your .+ is not\.$|^Neither your .+ nor your .+ is in your top \d+\.$/, (m) => groupWhyMs(m.input)],
  [/^Skill = (.+)\.$/, (m) => `Kemahiran = ${srcMs(m[1])}.`],
  [/^· (.+)$/, (m) => (SDG_MS[m[1]] || AREAS_MS[m[1]] ? `· ${SDG_MS[m[1]] || AREAS_MS[m[1]]}` : null)],
];

const srcMs = (s) => s.replace(/skills test/g, "ujian kemahiran").replace(/CV and tools/g, "CV dan alat").replace(/preferences/g, "keutamaan").replace(/ and /g, " dan ");

function planMs(s) {
  return names(s)
    .replace(/^Your CV shows /, "CV anda menunjukkan ").replace(/, your interests point to /, ", minat anda menghala ke ").replace(/^Your interests point to /, "Minat anda menghala ke ")
    .replace(/^Your CV shows no IT area at (\d+) or more yet/, "CV anda belum menunjukkan bidang IT dengan skor $1 atau lebih").replace(/your CV shows no IT area at (\d+) or more yet/, "CV anda belum menunjukkan bidang IT dengan skor $1 atau lebih")
    .replace(/^You have not added a CV or answered the interest questions, so nothing narrows the test down yet/, "Anda belum menambah CV atau menjawab soalan minat, jadi ujian belum dapat difokuskan")
    .replace(/; to compare at least (\d+) areas we add /, "; untuk membandingkan sekurang-kurangnya $1 bidang kami tambah ")
    .replace(/ — we'll check all 6 areas/, " — kami akan menyemak kesemua 6 bidang").replace(/ — we'll check these (\d+) areas/, " — kami akan menyemak $1 bidang ini")
    .replace(/\((\d+) questions, about (\d+) minutes\)\./, "($1 soalan, kira-kira $2 minit).");
}

function groupWhyMs(s) {
  const part = (x) => x.replace(/^interest not checked$/, "minat belum disemak").replace(/^skill not checked$/, "kemahiran belum disemak")
    .replace(/^interest ([\d.]+) \(#(\d+) of (\d+)\)$/, "minat $1 (#$2 daripada $3)").replace(/^skill ([\d.]+) \(#(\d+) of (\d+)\)$/, "kemahiran $1 (#$2 daripada $3)");
  let m;
  if ((m = s.match(/^Your (.+) and (.+) are both in your top (\d+)\.$/))) return `${cap(part(m[1]))} dan ${part(m[2])} anda kedua-duanya dalam ${m[3]} teratas.`;
  if ((m = s.match(/^Your (.+) is in your top (\d+), but your (.+) is not\.$/))) return `${cap(part(m[1]))} anda dalam ${m[2]} teratas, tetapi ${part(m[3])} anda tidak.`;
  if ((m = s.match(/^Your (.+) is in your top (\d+)\.$/))) return `${cap(part(m[1]))} anda dalam ${m[2]} teratas.`;
  if ((m = s.match(/^Neither your (.+) nor your (.+) is in your top (\d+)\.$/))) return `${cap(part(m[1]))} dan ${part(m[2])} anda tidak dalam ${m[3]} teratas.`;
  return null;
}
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);

const norm = (s) => s.replace(/\s+/g, " ").trim();
function tr(s) {
  const key = norm(s);
  if (!key) return s;
  if (MS[key] !== undefined) return MS[key];
  if (AREAS_MS[key]) return AREAS_MS[key];
  if (ROLES_MS[key]) return ROLES_MS[key];
  for (const [re, fn] of PATTERNS) {
    const m = key.match(re);
    if (m) { const out = fn(m); if (out) return out; }
  }
  return s;
}

// Area and role names that app.js draws itself (the radar chart wraps them over lines).
window.trName = (s) => (LANG === "ms" ? AREAS_MS[s] || ROLES_MS[s] || s : s);

/* Swap text in the page. The English of every node and attribute we change is kept, so
   switching back always starts from the English. Our own writes are dropped from the observer
   (takeRecords), so every record it reports is a change made by app.js: new English. */
const ORIGINAL = new WeakMap();
const ATTRS = ["placeholder", "title", "aria-label"];
let observer = null;

function setText(node) {
  if (!ORIGINAL.has(node)) ORIGINAL.set(node, node.nodeValue);
  const en = ORIGINAL.get(node);
  const key = norm(en);
  let out = en;
  if (LANG === "ms" && /[A-Za-z]/.test(key)) {
    const ms = tr(key);
    if (ms !== key) out = en.match(/^\s*/)[0] + ms + en.match(/\s*$/)[0];
  }
  if (node.nodeValue !== out) node.nodeValue = out;
}

const ORIGINAL_ATTR = new WeakMap();
function setAttrs(el) {
  for (const a of ATTRS) {
    if (!el.hasAttribute(a)) continue;
    const saved = ORIGINAL_ATTR.get(el) || {};
    if (!(a in saved)) { saved[a] = el.getAttribute(a); ORIGINAL_ATTR.set(el, saved); }
    const out = LANG === "ms" ? tr(saved[a]) : saved[a];
    if (el.getAttribute(a) !== out) el.setAttribute(a, out);
  }
}

function translate(root) {
  if (root.nodeType === Node.TEXT_NODE) { setText(root); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  if (root.closest && root.closest("pre, code, textarea, script, style, [data-no-i18n]")) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => (n.nodeType === Node.ELEMENT_NODE && /^(PRE|CODE|TEXTAREA|SCRIPT|STYLE)$/.test(n.tagName)) || (n.dataset && n.dataset.noI18n !== undefined)
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  for (let n = root; n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) setText(n); else setAttrs(n);
  }
}

function translateAll() {
  document.documentElement.lang = LANG;
  const btn = document.getElementById("lang");
  if (btn) {
    btn.textContent = LANG === "ms" ? "English" : "Bahasa Melayu";
    btn.setAttribute("lang", LANG === "ms" ? "en" : "ms");
  }
  translate(document.body);
  if (observer) observer.takeRecords();
}

function setLang(next) {
  LANG = next;
  try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { /* storage off: this page only */ }
  translateAll();
  window.dispatchEvent(new HashChangeEvent("hashchange"));  // app.js redraws the page (and its chart labels)
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("lang");
  if (btn) {
    btn.setAttribute("data-no-i18n", "");
    btn.onclick = () => setLang(LANG === "ms" ? "en" : "ms");
  }
  observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "characterData") {
        ORIGINAL.set(r.target, r.target.nodeValue);
        translate(r.target);
      } else if (r.type === "attributes") {
        const saved = ORIGINAL_ATTR.get(r.target);
        if (saved) delete saved[r.attributeName];
        setAttrs(r.target);
      } else {
        r.addedNodes.forEach(translate);
      }
    }
    observer.takeRecords();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  translateAll();
});
