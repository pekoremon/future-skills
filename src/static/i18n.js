/* Bahasa Melayu and Chinese for the interface. app.js keeps writing English; this file swaps
   each text node (and placeholder, title and aria-label) for the chosen language, and keeps the
   English so the switch can go back. Test questions, O*NET skill names, course titles and AI
   text stay in English. Loaded before app.js. */
"use strict";

const LANG_KEY = "future-skills-lang";
let LANG = (() => { try { const l = localStorage.getItem(LANG_KEY); return l === "ms" || l === "zh" ? l : "en"; } catch (e) { return "en"; } })();

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
// Chinese area names as in data/it_assessment.json (name_zh).
const AREAS_ZH = {
  "Cloud, Infrastructure & Networking": "云端与基础设施 / 网络",
  "IT Management & Analysis": "IT 管理与分析",
  "Web & Interface Design": "Web 与界面设计",
  "Software Engineering": "软件工程",
  "Cybersecurity": "网络安全",
  "Data & AI": "数据与 AI",
};
const ROLES_ZH = {
  "Software Developers": "软件开发人员",
  "Computer Programmers": "程序员",
  "Software Quality Assurance Analysts and Testers": "软件质量保证分析师与测试员",
  "Blockchain Engineers": "区块链工程师",
  "Data Scientists": "数据科学家",
  "Computer and Information Research Scientists": "计算机与信息研究科学家",
  "Business Intelligence Analysts": "商业智能分析师",
  "Database Administrators": "数据库管理员",
  "Database Architects": "数据库架构师",
  "Data Warehousing Specialists": "数据仓库专员",
  "Information Security Analysts": "信息安全分析师",
  "Penetration Testers": "渗透测试员",
  "Digital Forensics Analysts": "数字取证分析师",
  "Information Security Engineers": "信息安全工程师",
  "Network and Computer Systems Administrators": "网络与计算机系统管理员",
  "Computer Network Architects": "计算机网络架构师",
  "Computer Network Support Specialists": "计算机网络支持专员",
  "Computer User Support Specialists": "计算机用户支持专员",
  "Computer Systems Engineers/Architects": "计算机系统工程师/架构师",
  "Web Developers": "网页开发人员",
  "Web and Digital Interface Designers": "网页与数字界面设计师",
  "Video Game Designers": "电子游戏设计师",
  "Web Administrators": "网站管理员",
  "Computer Systems Analysts": "计算机系统分析师",
  "Information Technology Project Managers": "IT 项目经理",
  "Computer and Information Systems Managers": "计算机与信息系统经理",
};
const SDG_ZH = {
  "Good Health and Well-being": "良好健康与福祉",
  "Quality Education": "优质教育",
  "Decent Work and Economic Growth": "体面工作和经济增长",
  "Industry, Innovation and Infrastructure": "产业、创新和基础设施",
  "Reduced Inequalities": "减少不平等",
  "Responsible Consumption and Production": "负责任消费和生产",
  "Peace, Justice and Strong Institutions": "和平、正义与强大机构",
  "Partnerships for the Goals": "促进目标实现的伙伴关系",
};

// Exact text, keyed by the English with spaces collapsed.
const MS = {
  // header, footer, steps
  "Skills": "Kemahiran", "Interests": "Minat", "IT Test": "Ujian IT", "Matches": "Padanan", "Trends": "Trend",
  "Your CV": "CV anda", "Skills test": "Ujian kemahiran", "Your jobs": "Kerjaya anda", "(done)": "(selesai)",
  "Language": "Bahasa", "Data:": "Data:", "All profiles shown are fictional. Full list in SOURCES.md.": "Semua profil yang dipaparkan adalah rekaan. Senarai penuh dalam SOURCES.md.",
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
const byLength = (o) => Object.entries(o).sort((a, b) => b[0].length - a[0].length);
const NAMES = { ms: byLength({ ...AREAS_MS, ...ROLES_MS, ...SDG_MS }), zh: byLength({ ...AREAS_ZH, ...ROLES_ZH, ...SDG_ZH }) };
const names = (s) => {
  const out = NAMES[LANG].reduce((acc, [en, x]) => acc.split(en).join(x), s);
  return LANG === "zh" ? out.replace(/ and /g, "和") : out.replace(/ and (?=[A-Z])/g, " dan ");
};
// A list of names: "A, B and C" -> "A、B和C" in Chinese.
const list = (s) => (LANG === "zh" ? names(s).replace(/, /g, "、") : names(s));
// The test result's note on areas held back from the in-depth questions (pageTestResult heldNote).
const HELD = /^(.+) also scored (.+) in the quick check, but (?:was|were) not tested in depth, so (?:its area score is|their area scores are) held at ([\d.]+), the lower of the top 2\. The strongest area is the one with the highest area score: (.+) \(([\d.]+)\)\.$/;

// Text built from numbers or names: [pattern, (match) => BM].
const PATTERNS_MS = [
  [/^Step (\d) of 4 · (.+)$/, (m) => `Langkah ${m[1]} daripada 4 · ${tr(m[2])}`],
  [/^(.+) · demo: (.+)$/, (m) => `${tr(m[1])} · demo: ${m[2].replace("(fictional)", "(rekaan)")}`],
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
  [HELD, (m) => `${list(m[1])} juga mendapat ${m[2].replace(" and ", " dan ")} dalam semakan pantas, tetapi tidak diuji secara mendalam, jadi skor bidangnya ditetapkan pada ${m[3]}, iaitu yang lebih rendah antara 2 teratas. Bidang terkuat ialah bidang dengan skor bidang tertinggi: ${names(m[4])} (${m[5]}).`],
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
  [/^· (technology|skill)( · .+)?$/, (m) => `· ${MS[m[1]]}${m[2] ? ` ${tr(m[2])}` : ""}`],
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

// Chinese (Simplified), keyed like MS.
const ZH = {
  // header, footer, steps
  "Skills": "技能", "Interests": "兴趣", "IT Test": "IT 测验", "Matches": "职位匹配", "Trends": "趋势",
  "Your CV": "你的履历", "Skills test": "技能测验", "Your jobs": "你的职位", "(done)": "（已完成）",
  "Language": "语言", "Data:": "数据：", "All profiles shown are fictional. Full list in SOURCES.md.": "所有示范资料均为虚构。完整来源见 SOURCES.md。",
  "(CC BY 4.0, modified by the team; USDOL/ETA has not approved or endorsed it),": "（CC BY 4.0，经团队修改；USDOL/ETA 未审核或认可），",
  // errors
  "Cannot reach the Future Skills server. It may have stopped or be restarting.": "无法连接 Future Skills 服务器，它可能已停止或正在重新启动。",
  "Try again": "重试", "Back to start": "回到首页",
  // home
  "Future-ready careers for IT students": "面向 IT 学生的未来职业",
  "Find the part of IT that suits you, and the job to aim for.": "找到适合你的 IT 领域，以及值得努力的职位。",
  "Future Skills combines your CV, an interest questionnaire and a short IT skills test to show which of 6 IT areas fits you best, then ranks 26 IT roles, explains every score, shows the skills you still need, and links each role to the UN Sustainable Development Goals.":
    "Future Skills 结合你的履历、兴趣问卷和一份简短的 IT 技能测验，找出 6 个 IT 领域中最适合你的一个，再为 26 个 IT 职位排名、解释每一项分数、列出你还缺的技能，并把每个职位连到联合国可持续发展目标（SDG）。",
  "Optional. Upload it, or rate your skills instead. About 1 minute.": "可选。上传履历，或改为自己评估技能。约 1 分钟。",
  "Your interests": "你的兴趣",
  "36 quick statements about IT work you would enjoy. About 8 minutes.": "36 句关于你会喜欢的 IT 工作的简短描述，约 8 分钟。",
  "Only the 3 to 6 IT areas your CV and interests point to, with code you run in the browser.": "只测你的履历和兴趣指向的 3 至 6 个 IT 领域，包括在浏览器里运行的代码题。",
  "Grouped by what you enjoy and what you can do: ranked roles, the skills you still need and free courses.": "按你喜欢做和你能做的分组：职位排名、还缺的技能和免费课程。",
  "Every step is optional and you can go back any time; the more you do, the better the result.": "每一步都可以跳过，也可以随时回来；做得越多，结果越准。",
  "Continue where I left off": "从上次停下的地方继续", "Start: step 1, your CV": "开始：第 1 步，你的履历",
  "Try the demo student (fictional)": "试试示范学生（虚构）", "Try the demo student": "试试示范学生",
  "See the AI-trend data": "查看 AI 趋势数据",
  "Test questions, O*NET skill names, course titles and AI-written text stay in English, as in most IT workplaces.":
    "测验题目、O*NET 技能名称、课程标题和 AI 撰写的文字保留英文，与大多数 IT 职场一致。",
  // interests intro
  "What kind of work do you actually enjoy?": "你真正喜欢做哪一类工作？",
  "36 items": "36 题", "About 8 minutes": "约 8 分钟", "Skip any time": "可随时跳过",
  "Why": "目的", "How it is used": "如何使用", "Your data": "你的资料",
  "Finds the kind of IT work you enjoy most: building, analysing, designing, helping, leading or organising, and which of the 6 IT areas it points to.":
    "找出你最喜欢的 IT 工作类型：建造、分析、设计、帮助、领导或整理，以及它指向 6 个 IT 领域中的哪一个。",
  "Your top 3 interest areas are always in your skills test, so the test checks what you care about. In your results, interest and skill together decide which areas' jobs come first.":
    "你兴趣最高的 3 个领域一定会出现在技能测验里，所以测验会检查你在意的领域。在结果中，兴趣和技能一起决定哪些领域的职位排在前面。",
  "Answers stay in this browser tab and are only used to compute your matches.": "答案只保存在这个浏览器分页里，只用来计算你的匹配结果。",
  "Each item starts with \"I would enjoy...\". Say how much you agree, based on what you would enjoy, not what you are already good at.":
    "每一题都以“我会喜欢……”开头。请按你会不会喜欢来回答同意程度，而不是按你已经擅长什么。",
  "Continue questionnaire": "继续问卷", "Start questionnaire": "开始问卷",
  "Skip to step 3: the skills test": "跳到第 3 步：技能测验",
  "Questions written by the team, based on Holland's RIASEC interest types as used by": "题目由团队编写，依据 Holland 的 RIASEC 兴趣类型，参考",
  // interest items
  "← Back": "← 返回", "Pause": "暂停", "I would enjoy...": "我会喜欢……",
  "Strongly disagree": "非常不同意", "Disagree": "不同意", "Not sure": "不确定", "Agree": "同意", "Strongly agree": "非常同意",
  "Questions written by the team, based on Holland's RIASEC types as used by O*NET (USDOL/ETA). Not an official O*NET instrument.":
    "题目由团队编写，依据 O*NET（USDOL/ETA）所采用的 Holland RIASEC 类型。并非 O*NET 官方测验。",
  "Taking apart an old computer to see how the parts fit together.": "拆开一台旧电脑，看看零件是怎么组合在一起的。",
  "Finding out why a program keeps crashing by testing different ideas.": "通过尝试不同的想法，找出程序一直崩溃的原因。",
  "Designing a logo, icon or poster on the computer.": "用电脑设计标志、图标或海报。",
  "Helping a classmate who is stuck with their computer or phone.": "帮助电脑或手机出问题的同学。",
  "Leading a group project and making sure it finishes on time.": "带领小组项目，确保它准时完成。",
  "Setting passwords and access rights so only the right people can open each file.": "设置密码和访问权限，让只有对的人才能打开每个文件。",
  "Training a simple model that predicts something, like exam results from study hours.": "训练一个简单的模型来预测事情，例如用读书时数预测考试成绩。",
  "Explaining a technical idea in simple words to someone who is not into tech.": "用简单的话向不懂科技的人解释一个技术概念。",
  "Writing tests that check my code still works after every change.": "编写测试，确保每次修改后我的代码仍然正常运行。",
  "Choosing colours, fonts and layouts that make an app look attractive.": "挑选颜色、字体和版面，让应用程序看起来更吸引人。",
  "Setting up a Wi-Fi router and connecting network cables at home or school.": "在家里或学校设置 Wi-Fi 路由器并连接网线。",
  "Pitching an app idea and convincing others to support it.": "推介一个应用程序点子，并说服别人支持它。",
  "Sketching how a new app screen could look before anyone builds it.": "在开发之前，先画出新应用程序画面的样子。",
  "Starting my own tech company one day.": "有一天创办自己的科技公司。",
  "Installing an operating system (like Windows or Linux) on a laptop from scratch.": "从零开始在笔记本电脑上安装操作系统（例如 Windows 或 Linux）。",
  "Checking a program or spreadsheet carefully for small mistakes.": "仔细检查程序或电子表格里的小错误。",
  "Studying a large set of data to discover hidden patterns.": "研究大量数据，发现隐藏的规律。",
  "Interviewing people to understand the problems they face with an app.": "访谈用户，了解他们使用应用程序时遇到的问题。",
  "Giving a short talk to warn classmates about scam links and phishing.": "做一个简短的分享，提醒同学小心诈骗链接和网络钓鱼。",
  "Entering, sorting and cleaning up data in a spreadsheet.": "在电子表格里输入、排序和整理数据。",
  "Learning how a search engine or recommendation system decides what to show.": "了解搜索引擎或推荐系统如何决定显示什么。",
  "Deciding which features a product should have first.": "决定一个产品应该先有哪些功能。",
  "Creating animations, short videos or characters for a game.": "为游戏制作动画、短视频或角色。",
  "Fixing a device that stopped working by testing it step by step.": "一步一步测试，修好一台坏掉的设备。",
  "Meeting clients to find out what they want and agreeing on a deal.": "和客户见面，了解他们的需求并谈成合作。",
  "Building a gaming PC or small server from separate parts.": "用零件组装一台游戏电脑或小型服务器。",
  "Teaching older family members how to use apps safely.": "教家里的长辈安全地使用应用程序。",
  "Reading about how hackers break into systems and how to stop them.": "阅读黑客如何入侵系统以及如何阻止他们。",
  "Writing clear instructions or guides that others can follow.": "撰写别人能照着做的清楚说明或指南。",
  "Coming up with an original idea for a game or website.": "为游戏或网站想出原创点子。",
  "Making sure a system follows rules, policies and security standards.": "确保系统遵守规则、政策和安全标准。",
  "Making a personal website that shows my own style.": "制作一个展现个人风格的网站。",
  "Organising a coding competition or tech event at school.": "在学校举办编程比赛或科技活动。",
  "Working with real equipment in a server room, not only at a desk.": "在机房里操作真实设备，而不只是坐在桌前。",
  "Building technology that makes life easier for people with disabilities.": "开发让残障人士生活更方便的科技。",
  "Running experiments to compare which solution works faster.": "做实验比较哪个方案运行得更快。",
  // interest results
  "Your interest code (Holland code)": "你的兴趣代码（Holland 代码）",
  "Which IT areas you would enjoy": "你会喜欢哪些 IT 领域",
  "From the 4 questions about each area (0–100).": "根据每个领域的 4 道题（0–100）。",
  "Scores for the six interest types": "六种兴趣类型的分数", "Your three strongest interests": "你最强的三种兴趣",
  "This is a direction, not a verdict. Interests change with experience. In your matches they sit next to the skills test and your CV.":
    "这只是方向，不是定论。兴趣会随经验改变。在匹配结果中，兴趣会和技能测验及你的履历一起参考。",
  "Next: step 3, the skills test": "下一步：第 3 步，技能测验", "Answer again": "重新作答",
  "Type descriptions written by the team, based on": "类型说明由团队编写，依据",
  "Realistic": "实用型", "Investigative": "研究型", "Artistic": "艺术型", "Social": "社会型", "Enterprising": "企业型", "Conventional": "常规型",
  "Hands-on work with tools, machines, materials or living things, often outdoors or in workshops: engineering, electronics, construction, agriculture.":
    "用工具、机器、材料或生物动手做事，常在户外或工作坊：工程、电子、建筑、农业。",
  "Studying and solving problems with ideas, data and research: science, medicine, mathematics, statistics and information technology.":
    "用想法、数据和研究来探索并解决问题：科学、医学、数学、统计和信息技术。",
  "Creating designs, media, writing, music or performances, and applying artistic ideas to products and interfaces.":
    "创作设计、媒体、文字、音乐或表演，并把艺术构想用在产品和界面上。",
  "Helping, teaching, counselling or caring for people: education, health care and community services.":
    "帮助、教导、辅导或照顾他人：教育、医疗和社区服务。",
  "Leading, persuading, selling and managing: business, marketing, finance, management and law.":
    "领导、说服、销售和管理：商业、营销、金融、管理和法律。",
  "Organising information and following clear procedures: administration, accounting, data, IT operations and finance.":
    "整理信息并遵循清楚的程序：行政、会计、数据、IT 运维和金融。",
  "Every answer is the same, so the questionnaire cannot tell your interests apart. It is left out of your matches.":
    "所有答案都一样，问卷无法分辨你的兴趣，所以不会用在你的匹配结果中。",
  "Your interest in the six IT areas is very even. You may still be exploring: treat this part of the result as a light hint.":
    "你对六个 IT 领域的兴趣非常平均，可能还在探索中：这部分结果只当作参考。",
  // skills page
  "What can you already do?": "你已经会做什么？",
  "Fastest: upload your CV.": "最快的方法：上传你的履历。",
  "AI reads it and ticks the technologies you use; then check the list below.": "AI 会读取履历并勾选你用过的技术；然后再检查下面的清单。",
  "Upload my CV": "上传我的履历",
  "Or rate what you know below; anything left at “–” counts as not yet learned. Scale: 1 Basic · 2 Some · 3 Good · 4 Strong · 5 Expert.":
    "或者在下面评估你会的东西；保留“–”的项目算作还没学过。评分：1 基础 · 2 一些 · 3 良好 · 4 扎实 · 5 专家。",
  "Highest education (finished or about to finish)": "最高学历（已完成或即将完成）",
  "Diploma": "文凭", "Bachelor's degree": "学士学位", "Master's degree or higher": "硕士或以上",
  "General skills": "通用技能", "Knowledge areas": "知识领域",
  "Skills used in most jobs, rated by O*NET for each role. Similar skills are grouped together.": "大多数工作都会用到的技能，O*NET 为每个职位评定过。相似的技能已合并成一组。",
  "Subjects you have studied or worked with.": "你学过或在工作中用过的科目。",
  "Technologies you use": "你使用的技术", "Search technologies": "搜索技术", "e.g. Python, SQL, Figma": "例如 Python、SQL、Figma",
  "Next: step 2, interests": "下一步：第 2 步，兴趣",
  "None": "无", "Basic": "基础", "Some": "一些", "Good": "良好", "Strong": "扎实", "Expert": "专家",
  "Communication": "沟通", "Reading, writing, listening and speaking": "阅读、写作、聆听和口语",
  "Maths and science": "数学与科学", "Using maths and scientific methods to solve problems": "运用数学和科学方法解决问题",
  "Problem solving": "解决问题", "Critical thinking, complex problems, judgement and decisions": "批判性思考、复杂问题、判断与决策",
  "Learning and teaching": "学习与教学", "Picking up new things fast and teaching others": "快速学会新事物并教导他人",
  "Working with people": "与人合作", "Reading people, coordinating with others, helping customers": "理解他人、与人协调、协助客户",
  "Persuading and negotiating": "说服与谈判", "Changing minds and reaching agreements": "改变他人想法并达成协议",
  "Programming and design": "编程与设计", "Writing code, designing technology, working out what users need": "编写代码、设计技术、找出用户需求",
  "Systems and quality": "系统与质量", "Analysing and evaluating systems, monitoring performance, testing quality": "分析和评估系统、监控性能、测试质量",
  "Running and watching systems": "运行与监控系统", "Operating systems and watching how they perform": "操作系统并观察其运行状况",
  "Troubleshooting and repair": "排除故障与维修", "Finding faults, maintaining and fixing equipment": "找出故障、维护和修理设备",
  "Managing time, money and people": "管理时间、金钱和人员", "Planning time, budgets, materials and staff": "规划时间、预算、物资和人手",
  "Business and management": "商业与管理", "Running organisations, office administration, HR": "经营组织、办公室行政、人力资源",
  "Finance and economics": "金融与经济", "Accounting, banking, economics": "会计、银行、经济",
  "Sales and customer service": "销售与客户服务", "Marketing, selling, serving customers": "营销、销售、服务客户",
  "Computers and telecoms": "计算机与电信", "Hardware, software, networks, telecommunications": "硬件、软件、网络、电信",
  "Engineering and mechanics": "工程与机械", "Engineering, technology and machines": "工程、技术和机器",
  "Mathematics": "数学", "Maths knowledge: algebra, statistics, calculus": "数学知识：代数、统计、微积分",
  "Psychology": "心理学", "How people think, learn and behave": "人如何思考、学习和行为",
  "Education and training": "教育与培训", "Teaching and designing training": "教学和设计培训课程",
  "Language, media and design": "语言、媒体与设计", "English, media and design": "英语、媒体与设计",
  "Law and public safety": "法律与公共安全", "Law, government, security": "法律、政府、安全",
  // CV page
  "Let AI read your CV": "让 AI 读取你的履历",
  "Upload your CV to get a short summary of your skills and qualifications. The IT areas it shows evidence for are checked in your skills test, so the test stays short.":
    "上传履历，获得你的技能和学历的简短摘要。履历中有证据的 IT 领域会在技能测验里检查，所以测验不会太长。",
  "Choose your CV": "选择你的履历", "PDF, Word (.docx) or text, up to 2 MB": "PDF、Word（.docx）或文本，最多 2 MB",
  "Try a sample CV (fictional)": "试试示范履历（虚构）",
  "Your CV is sent to our server and, when AI is on, to Fireworks AI to write the summary. It is not saved. Leave out your IC number, address and phone if you prefer.":
    "你的履历会传到我们的服务器；开启 AI 时也会传给 Fireworks AI 来撰写摘要。履历不会被保存。你可以先删除身份证号码、地址和电话。",
  "No CV? Rate your skills instead": "没有履历？改为自己评估技能", "Skip this step": "跳过这一步",
  "Summary": "摘要", "Qualifications": "学历与证书", "Use it for your matches": "用于你的匹配结果",
  "No skills found.": "没有找到技能。", "No degree, diploma or certificate found.": "没有找到学位、文凭或证书。",
  "Technologies found by matching words in your CV against the app's list (O*NET In Demand technologies), not by AI. Untick anything that is wrong.":
    "这些技术是把履历中的字词和本应用的清单（O*NET In Demand 技术）比对找出的，不是 AI 判断的。请取消勾选不正确的项目。",
  "None of the tracked technologies were found.": "没有找到清单中的任何技术。",
  "Set highest education to": "将最高学历设为", "Add to my skills": "加入我的技能",
  "You still rate the general skills yourself.": "通用技能仍需你自己评估。",
  "AI summary not available right now, so this summary lists what our matcher found in your CV.": "AI 摘要暂时无法使用，所以这份摘要列出的是我们的比对程序在履历中找到的内容。",
  "Evidence per IT area": "各 IT 领域的证据",
  "No evidence found: AI could not read it right now and none of the tracked technologies are in your CV. Your matches use your test and questionnaire instead.":
    "没有找到证据：AI 暂时无法读取，而且履历中没有清单上的技术。你的匹配结果会改用测验和问卷。",
  "Your matches use these scores as your CV evidence.": "你的匹配结果会把这些分数当作履历证据。",
  "Do not use them": "不要使用", "Not used in your matches.": "未用于你的匹配结果。", "Use them": "使用",
  // results
  "Best matches for your level": "最适合你学历的职位",
  "No answers yet": "还没有作答", "Do at least one of steps 1 to 3 first, or try the fictional demo student.": "请先完成第 1 至 3 步中的至少一步，或试试虚构的示范学生。",
  "Scoring IT roles…": "正在为 IT 职位评分……", "Your matches": "你的匹配结果",
  "Future scenario": "未来情景",
  "These are estimates, not predictions.": "这些是估计，不是预测。",
  "Nobody knows how fast AI will change jobs. Each scenario is a different assumption about the future, built from public data (DOSM, MyCOL, arXiv) and weights the team chose. Compare them: a role that ranks high in all three is a safer choice than one that ranks high in only one. The decision is yours.":
    "没有人知道 AI 会多快改变工作。每个情景都是对未来的不同假设，依据公开数据（DOSM、MyCOL、arXiv）和团队选定的权重。请比较一下：三个情景中都排名靠前的职位，比只在一个情景中靠前的更稳妥。最终由你决定。",
  "Current trends": "当前趋势", "Fast AI adoption": "AI 快速普及", "Malaysian demand leads": "马来西亚需求主导",
  "Malaysian job demand and AI momentum count equally, as in the trend score.": "马来西亚职位需求和 AI 势头各占一半，与趋势分相同。",
  "AI spreads quickly into every field, so how fast AI research is entering a field matters more than today's hiring.": "AI 迅速进入各个领域，所以 AI 研究进入某个领域的速度，比目前的招聘情况更重要。",
  "AI adoption is slow and uneven, so today's Malaysian employment growth decides which fields need people.": "AI 普及缓慢且不平均，所以马来西亚目前的就业增长决定哪些领域需要人。",
  "Study time per week": "每周学习时间",
  "IT area fit": "IT 领域契合度", "Interest fit": "兴趣契合度", "Skill fit": "技能契合度", "AI-era trend": "AI 时代趋势",
  "IT area fit:": "IT 领域契合度：", "Interest fit:": "兴趣契合度：", "Skill fit:": "技能契合度：", "AI-era trend:": "AI 时代趋势：",
  "not scored": "未评分", "Show all": "显示全部",
  "Start with your own answers": "用你自己的答案开始", "Change my skills": "修改我的技能", "Take the skills test": "参加技能测验",
  "How the trend score works": "趋势分如何计算", "How your IT areas were scored": "你的 IT 领域如何评分",
  "No roles in your best-fit areas match your education level yet. Try a higher education level on the skills page.": "你最适合的领域中暂时没有符合你学历的职位。可以在技能页选择更高的学历试试。",
  "Best fit for you": "最适合你", "High interest and high skill: these areas' roles come first.": "兴趣高、技能也高：这些领域的职位排在最前面。",
  "You can do this, but it may not excite you": "你做得到，但可能不太感兴趣", "High skill, lower interest: these roles are listed after your best fit.": "技能高、兴趣较低：这些职位排在最适合的之后。",
  "Want to get there?": "想往这里发展吗？", "High interest, but your skills are not there yet. Not in your recommended list: here is what to learn first.": "兴趣高，但技能还不够。不在推荐名单里：以下是要先学的东西。",
  "Best fit for your interests · skills not checked yet": "最符合你的兴趣 · 技能尚未检查",
  "Best fit for your skills · interests not checked yet": "最符合你的技能 · 兴趣尚未检查",
  "Your IT areas are not scored yet:": "你的 IT 领域还没有分数：", "add your CV": "加入你的履历", "answer the interest questions": "回答兴趣问题",
  "take the skills test": "参加技能测验", "All roles are listed by match score below.": "下面按匹配分列出所有职位。",
  "Not shown": "未显示", "Biggest skill gaps": "最大的技能差距", "for its best-matching roles:": "（针对最匹配的职位）：",
  "Your skills are not checked yet, so this is from your interests only.": "你的技能还没检查，所以这只根据你的兴趣。",
  "Add your CV": "加入你的履历", "Your interests are not checked yet, so this is from your skills only.": "你的兴趣还没检查，所以这只根据你的技能。",
  "Answer the interest questions (8 min)": "回答兴趣问题（8 分钟）",
  "On MyCOL critical list": "列于 MyCOL 紧缺职业名单", "Related MyCOL occupation": "相关的 MyCOL 职业", "Other IT area": "其他 IT 领域",
  "Same rank in all 3 scenarios": "3 个情景排名相同", "The rank does not change between the three future scenarios": "排名在三个未来情景之间没有变化",
  "Needs further study": "需要进修", "Needs extra qualification": "需要额外资格", "Licensed profession, reference only": "需执照的专业，仅供参考", "No trend data (neutral 50)": "没有趋势数据（中性 50）",
  "How to get there: learning path →": "怎么达到：学习路径 →", "Why this score, and what to learn": "为什么是这个分数，要学什么",
  "Explain this for me": "帮我解释", "Explain again": "重新解释", "Writing a plain-language explanation…": "正在撰写浅白的解释……",
  "AI explanation not available right now, so this is a plain summary of your scores.": "AI 解释暂时无法使用，以下是你分数的简单摘要。",
  "You meet the level O*NET lists for every rated skill of this role.": "这个职位每一项已评估的技能，你都达到 O*NET 列出的水平。",
  "Technologies to learn": "要学的技术", "See the full learning path, with videos": "查看完整学习路径（含视频）",
  "Loading role details…": "正在载入职位详情……", "Could not load role details.": "无法载入职位详情。",
  "Licences and certifications": "执照与证书", "required to practise in Malaysia": "在马来西亚执业必备", "O*NET occupation:": "O*NET 职业：",
  "Your learning path": "你的学习路径", "Ordered by the biggest gap first; all free.": "按差距最大的先排；全部免费。",
  "self-paced, no stated length": "自定进度，未注明时长", "self-paced": "自定进度", "Free": "免费",
  "Your plan was re-checked with new trend data": "已用新的趋势数据重新检查你的计划",
  "Learning paths below now follow the new ranking.": "下面的学习路径已按新排名更新。", "Nothing in your ranking changed.": "你的排名没有变化。",
  // trends
  "AI-era trend signals": "AI 时代趋势信号",
  "Which IT areas does Malaysia need, and how fast is AI entering them?": "马来西亚需要哪些 IT 领域？AI 进入这些领域有多快？",
  "These signals describe the recent past; they do not predict the future.": "这些信号描述的是最近的过去，不是预测未来。",
  "Each one compares 1 to 4 data points, so the trend scores built from them are estimates. See the confidence of each signal below, and the three future scenarios on your jobs page.":
    "每个信号只比较 1 至 4 个数据点，所以由此算出的趋势分只是估计。请看下面每个信号的可信度，以及职位页上的三个未来情景。",
  "Malaysian demand:": "马来西亚需求：", "AI momentum:": "AI 势头：", "· AI momentum:": "· AI 势头：", "Malaysian demand": "马来西亚需求", "AI momentum": "AI 势头",
  "no data": "没有数据",
  "Each signal has a direction (up or on MyCOL = +1; flat, near or not on MyCOL = 0) and a confidence (high, medium, low). Each part = 50 + 50 × the confidence-weighted average direction.":
    "每个信号都有方向（上升或列于 MyCOL = +1；持平、接近或不在 MyCOL = 0）和可信度（高、中、低）。每个部分 = 50 + 50 × 按可信度加权的平均方向。",
  ": MyCOL coverage of the area, DOSM online ads where DOSM has a series, and, for a role, whether it is on MyCOL.":
    "：该领域的 MyCOL 覆盖率、DOSM 有数据系列时的网上招聘广告，以及（针对职位）是否列于 MyCOL。",
  ": growth in AI papers in the area's arXiv categories. Trend score = 50% demand + 50% AI momentum; a part with no data is left out, never estimated. The weights are team choices; the future scenarios on the Matches page change them.":
    "：该领域 arXiv 类别中 AI 论文的增长。趋势分 = 50% 需求 + 50% AI 势头；没有数据的部分会被略过，绝不估算。权重由团队选定；职位匹配页上的未来情景会改变权重。",
  "Update data": "更新数据",
  "Fetches the latest OpenDOSM figures (and optionally arXiv, about 2 minutes), then recomputes the signals and scores. If a source fails, its previous data is kept.":
    "获取最新的 OpenDOSM 数据（可选择同时更新 arXiv，约 2 分钟），然后重新计算信号和分数。某个来源失败时，会保留它之前的数据。",
  "Also refresh arXiv paper counts": "同时更新 arXiv 论文数量", "Update data now": "立即更新数据", "Updating…": "正在更新……",
  "Update failed; previous data kept.": "更新失败，已保留之前的数据。",
  "Signals by IT area": "各 IT 领域的信号", "ICT sector background (not scored)": "ICT 行业背景（不计分）", "All input data with sources": "所有输入数据及来源",
  "For": "对象", "Signal": "信号", "Direction": "方向", "Confidence": "可信度", "Detail": "详情", "Entity": "实体", "Metric": "指标", "Value": "数值", "Period": "期间", "Source": "来源",
  "composition effect": "结构效应",
  "Limits: DOSM publishes ads for only one IT occupation (Software Developers), MyCOL is one edition (a status, not a trend), and arXiv is global. Where AI papers grew only because all papers grew, the signal is marked \"composition effect\".":
    "限制：DOSM 只公布一个 IT 职业（软件开发人员）的招聘广告，MyCOL 只有一期（是状态，不是趋势），arXiv 是全球数据。如果 AI 论文增加只是因为所有论文都在增加，该信号会标为“结构效应”。",
  // test
  "Can you do the work in the areas that fit you?": "在适合你的领域里，你做得来吗？",
  "1 · Quick check": "1 · 快速检测", "2 · In depth": "2 · 深入", "3 · Your result": "3 · 你的结果",
  "Your 2 strongest of these get 2 harder questions and 1 hands-on task each: write code or SQL, analyse logs, or plan a project.":
    "其中你最强的 2 个领域各有 2 道较难的题和 1 项实作：写代码或 SQL、分析日志，或规划项目。",
  "These areas ranked for you, a readiness score for your top 2, the skills to work on, and an explanation for every answer.":
    "为你排列这些领域、给前 2 名一个准备度分数、列出要加强的技能，并解释每一道题的答案。",
  "Code runs in your browser, in Python. The first coding question downloads Python (about 10 MB) once.": "代码在你的浏览器里用 Python 运行。第一道编程题会下载一次 Python（约 10 MB）。",
  "See your last result": "查看上次结果", "Start a new test": "开始新的测验", "Start the test": "开始测验", "Skip to step 4, my jobs": "跳到第 4 步，我的职位",
  "Quick check": "快速检测", "In depth": "深入", "Hands-on": "实作",
  "Select all that apply.": "选出所有适用的答案。", "Your answer": "你的答案", "Your Python code": "你的 Python 代码", "Run tests": "运行测试",
  "Tables and data": "数据表和数据", "Your SQL query (SQLite)": "你的 SQL 查询（SQLite）", "Run query": "运行查询", "No rows": "没有数据行",
  "Showing the first 50 rows.": "只显示前 50 行。", "Running…": "正在运行……", "Loading Python (first time only)…": "正在载入 Python（只需第一次）……",
  "Pass": "通过", "Fail": "失败", "gave": "得到", "Not allowed:": "不允许：",
  "See my result": "查看我的结果", "Continue to in-depth questions": "继续深入题", "Next": "下一题",
  "Running your tests…": "正在运行你的测试……", "Finding your strongest areas…": "正在找出你最强的领域……", "Scoring…": "正在评分……",
  "These questions go deeper.": "接下来的题目更深入。", "Your strongest areas so far:": "你目前最强的领域：",
  "Extra quick check:": "额外快速检测：", "Your earlier answers stay as they are.": "你之前的答案保持不变。",
  "Want to test your other IT areas?": "想测试你的其他 IT 领域吗？",
  // test result
  "/ 100 readiness": "/ 100 准备度", "Area score": "领域分数", "Jobs in this area (O*NET):": "这个领域的职位（O*NET）：",
  "Job-ready": "可胜任", "Developing": "发展中", "Foundation": "需打基础",
  "An indicative self-check of job-entry skills, not a certification or a hiring decision.": "这是入职技能的参考性自我检测，不是证书，也不是录用决定。",
  "Share my result": "分享我的结果", "Link copied": "链接已复制",
  "Anyone with this link sees your IT profile, top 2 areas and skills to work on; the page does not show your answers, but the link itself carries them (that is how the result is rebuilt), so share it only with people you choose. Nothing is saved on our server.":
    "任何拿到这个链接的人都能看到你的 IT 概况、前 2 个领域和要加强的技能；页面不会显示你的答案，但链接本身带有答案（结果就是这样重建的），所以只分享给你选择的人。我们的服务器不保存任何资料。",
  "Your IT profile": "你的 IT 概况", "Their IT profile": "对方的 IT 概况",
  "Quick-check score in each tested area (0–100): the same number of questions per area, so you can compare them. Your top 2 (bold) were then tested in depth.":
    "每个已测领域的快速检测分数（0–100）：每个领域题数相同，所以可以互相比较。你的前 2 名（粗体）随后进行了深入测验。",
  "Quick-check score in each tested area (0–100): the same number of questions per area. Their top 2 (bold) were then tested in depth.":
    "每个已测领域的快速检测分数（0–100）：每个领域题数相同。对方的前 2 名（粗体）随后进行了深入测验。",
  "Your top 2, tested in depth": "你的前 2 名，深入测验", "Their top 2, tested in depth": "对方的前 2 名，深入测验",
  "Readiness counts the in-depth and hands-on questions in that area. Your strongest area has the highest area score; an area seen only in the quick check is never ranked above these two, here or on your jobs page. Right answers also count as skills in your job matches.":
    "准备度计算的是该领域的深入题和实作题。你最强的领域是领域分数最高的那个；只在快速检测出现的领域，排名永远不会高于这两个，这里和职位页都一样。答对的题目也会算作你在职位匹配中的技能。",
  "Skills to work on": "要加强的技能", "Skills they are working on": "对方正在加强的技能", "Nothing: every answer was right.": "没有：每一题都答对了。",
  "Next: step 4, your jobs.": "下一步：第 4 步，你的职位。",
  "Your areas grouped by what you enjoy and what you can do, with ranked roles and the skills you still need.": "按你喜欢做和你能做的为领域分组，附职位排名和你还缺的技能。",
  "Next: step 4, my jobs": "下一步：第 4 步，我的职位", "Add your CV (1 min)": "加入你的履历（1 分钟）", "Do step 2, interests (8 min)": "完成第 2 步，兴趣（8 分钟）",
  "Review every answer": "检查每一题", "Take a new test": "重新测验", "Home": "首页",
  "Right": "正确", "Partly right": "部分正确", "Wrong": "错误", "Not answered.": "未作答。", "Answer:": "答案：", "Source:": "来源：",
  "Passes every test (see the explanation)": "通过所有测试（见说明）",
  "Shared IT skills test result": "分享的 IT 技能测验结果", "Loading the shared result…": "正在载入分享的结果……",
  "Which part of IT suits you?": "哪个 IT 领域适合你？", "A free skills test in the IT areas your CV and interests point to.": "针对你的履历和兴趣所指向的 IT 领域，提供免费技能测验。",
  "Take the IT skills test": "参加 IT 技能测验", "What is Future Skills?": "Future Skills 是什么？",
  "This share link does not work": "这个分享链接无效", "It may be cut off, or made with an older version of the test.": "它可能被截断了，或是用旧版测验生成的。",
  // learning path
  "Building the learning path…": "正在建立学习路径……", "← Back to my jobs": "← 返回我的职位", "Back to my jobs": "返回我的职位",
  "Learning path": "学习路径", "What the job involves (O*NET)": "这份工作做什么（O*NET）",
  "Everything here is free. We opened every link and checked its title, channel and length; videos open on YouTube in a new tab.":
    "这里的一切都是免费的。我们打开过每个链接，核对过标题、频道和时长；视频会在新分页的 YouTube 打开。",
  "Start here: the basics every student in this area needs.": "从这里开始：这个领域每个学生都需要的基础。",
  "Courses aimed at this exact job.": "专为这个职位设计的课程。", "Close your skill gaps": "补上你的技能差距", "Skills and tools this job uses": "这个职位用到的技能和工具",
  "Your biggest gaps for this role, with where to learn each one. Skills you have not rated yet come last;": "你在这个职位上最大的差距，以及每一项可以在哪里学。尚未评估的技能排在最后；",
  "rate them": "去评估", "to see your real gaps.": "就能看到真实差距。",
  "From O*NET, tools first. Take the steps on the home page to see only the ones you are missing.": "来自 O*NET，工具排在前面。完成首页的步骤，就只会看到你缺少的项目。",
  "Prove it": "证明你的能力", "A recognised certificate or a portfolio shows employers what you can do.": "认可的证书或作品集能让雇主看到你的能力。",
  "No certification listed for this role yet. A portfolio of the projects from the courses above is the best proof.": "这个职位暂时没有列出证书。用上面课程的项目做成作品集，就是最好的证明。",
  "No checked free resource in our list yet.": "我们的清单里暂时没有核实过的免费资源。", "Certification": "证书",
  "technology": "技术", "skill": "技能", "Free course": "免费课程", "▶ YouTube video": "▶ YouTube 视频", "▶ YouTube playlist": "▶ YouTube 播放列表",
  "What this path contributes to": "这条路径的贡献",
  "The UN Sustainable Development Goal targets this job serves, and the skills on this path that build them. The links are the team's judgement (data/sdg_map.csv), not UN text; hover a skill to see why.":
    "这份工作对应的联合国可持续发展目标细项，以及这条路径上培养这些目标的技能。这些关联是团队的判断（data/sdg_map.csv），不是联合国原文；把鼠标移到技能上可以看原因。",
  "Working already? Courses your employer can claim": "已经在工作？雇主可申请补贴的课程", "HRD Corp claimable": "可向 HRD Corp 申请",
  "Paid courses whose provider page says they are claimable under HRD Corp. Only an employer registered and paying the HRD Corp levy can claim, and it must apply before the course starts. Check with the provider and your HR first. Not part of the free plan above or its hours.":
    "提供者网页注明可向 HRD Corp 申请补贴的付费课程。只有已注册并缴交 HRD Corp 税款的雇主才能申请，而且必须在课程开始前申请。请先向课程提供者和公司 HR 确认。不属于上面的免费计划，也不计入其时数。",
};

const srcZh = (s) => s.replace(/skills test/g, "技能测验").replace(/CV and tools/g, "履历与工具").replace(/preferences/g, "偏好").replace(/ and /g, "和");

// Same shapes as PATTERNS_MS, in Chinese word order.
const PATTERNS_ZH = [
  [/^Step (\d) of 4 · (.+)$/, (m) => `第 ${m[1]} 步，共 4 步 · ${tr(m[2])}`],
  [/^(.+) · demo: (.+)$/, (m) => `${tr(m[1])} · 示范：${m[2].replace(" (fictional)", "（虚构）")}`],
  [/^Your CV · optional, about 1 minute$/, () => "你的履历 · 可选，约 1 分钟"],
  [/^Your skills \(no CV needed\)$/, () => "你的技能（不需要履历）"],
  [/^Your interest results$/, () => "你的兴趣结果"],
  [/^IT skills test( result)?$/, (m) => (m[1] ? "IT 技能测验结果" : "IT 技能测验")],
  [/^Item (\d+) of (\d+)$/, (m) => `第 ${m[1]} 题，共 ${m[2]} 题`],
  [/^([RIASEC]) · (\w+)$/, (m) => (ZH[m[2]] ? `${m[1]} · ${ZH[m[2]]}` : null)],
  [/^(.+\.) Type descriptions written by the team, based on$/, (m) => `${tr(m[1])}${ZH["Type descriptions written by the team, based on"]}`],
  [/^Question (\d+) of (\d+)$/, (m) => `第 ${m[1]} 题，共 ${m[2]} 题`],
  [/^about (\d+) min$/, (m) => `约 ${m[1]} 分钟`],
  [/^(\d+) of (\d+) skill groups rated · (\d+) technologies$/, (m) => `已评估 ${m[1]}/${m[2]} 组技能 · ${m[3]} 项技术`],
  [/^\((\d+) that O\*NET marks In Demand\)$/, (m) => `（${m[1]} 项为 O*NET 标记的 In Demand 技术）`],
  [/^(.+) level$/, (m) => (ZH[m[1]] ? `${ZH[m[1]]}水平` : null)],
  [/^Show all (\d+) roles$/, (m) => `显示全部 ${m[1]} 个职位`],
  [/^Reading (.+)…$/, (m) => `正在读取${m[1] === "the sample CV" ? "示范履历" : ` ${m[1]}`}……`],
  [/^Read ([\d,]+) characters from (.+)\.$/, (m) => `已从${m[2] === "the sample CV" ? "示范履历" : ` ${m[2]} `}读取 ${m[1]} 个字符。`],
  [/^Could not read the CV: (.+)$/, (m) => `无法读取履历：${m[1]}`],
  [/^Could not get an explanation: (.+)$/, (m) => `无法取得解释：${m[1]}`],
  [/^Something went wrong: (.+)$/, (m) => `出了点问题：${m[1]}`],
  [/^Continue \((\d+) answered\)$/, (m) => `继续（已答 ${m[1]} 题）`],
  [/^Test this area too \(about (\d+) min\)$/, (m) => `也测这个领域（约 ${m[1]} 分钟）`],
  [/^Test all remaining areas \(about (\d+) min\)$/, (m) => `测试其余所有领域（约 ${m[1]} 分钟）`],
  [/^Your test left out (this area|these (\d+) areas)\. Add a (\d+)-question quick check for any of them: your earlier answers stay, and your result groups are worked out again with the new scores\.$/,
    (m) => `你的测验没有包括${m[2] ? `这 ${m[2]} 个领域` : "这个领域"}。可以为任何一个领域加做 ${m[3]} 题的快速检测：之前的答案会保留，结果分组会用新分数重新计算。`],
  [/^(\d+) questions: 3 in each of these (\d+) areas, so each gets the same fair chance\.$/, (m) => `${m[1]} 题：这 ${m[2]} 个领域各 3 题，每个领域机会均等。`],
  [/^Not checked: (.+)\. They get no test score; your results use your CV and interests for them\.$/, (m) => `未检查：${list(m[1])}。这些领域没有测验分数；结果会改用你的履历和兴趣。`],
  [/^To focus the test, first$/, () => "想让测验更聚焦，请先"],
  [/^Not tested: (.+)\. No test score\.$/, (m) => `未测验：${list(m[1])}。没有测验分数。`],
  [/^(Your strongest|Strongest) IT area: (.+)$/, (m) => `${m[1] === "Strongest" ? "最强的 IT 领域" : "你最强的 IT 领域"}：${names(m[2])}`],
  [/^= 40% quick check \((\d+)\) \+ 60% readiness \((\d+)\)$/, (m) => `= 40% 快速检测（${m[1]}）+ 60% 准备度（${m[2]}）`],
  [HELD, (m) => `${list(m[1])}在快速检测中也得了 ${m[2].replace(" and ", "和")} 分，但没有进行深入测验，所以领域分数固定为 ${m[3]}（前 2 名中较低的分数）。最强的领域是领域分数最高的那个：${names(m[4])}（${m[5]}）。`],
  [/^Someone shared their Future Skills test result with you\. (.+)$/, (m) => `有人和你分享了他们的 Future Skills 测验结果。${tr(m[1])}`],
  [/^Quick-check score in each of your (\d+) tested IT areas: (.+) out of 100$/, (m) => `你已测的 ${m[1]} 个 IT 领域的快速检测分数：${names(m[2])}（满分 100）`],
  [/^Summary written by AI \((.+)\) from your CV\. It can make mistakes, so check it against your CV\.$/, (m) => `摘要由 AI（${m[1]}）根据你的履历撰写，可能有错，请对照你的履历检查。`],
  [/^Written by AI \((.+)\) from your scores above\. It may still be wrong; the numbers above are the source of truth\.$/, (m) => `由 AI（${m[1]}）根据上面的分数撰写，仍可能有错；请以上面的数字为准。`],
  [/^(.+) fits you best \(area fit ([\d.]+)\)(.*)$/, (m) => `${names(m[1])}最适合你（领域契合度 ${m[2]}）${m[3].replace(/^, a clear lead of ([\d.]+) points\.$/, "，明显领先 $1 分。").replace(/^, but only ([\d.]+) points ahead of (.+): look at both\.$/, (x, p, n) => `，但只比${names(n)}多 ${p} 分：两个都看看。`).replace(/^\.$/, "。")}`],
  [/^(\d+) of your (\d+) sources rank (.+) first(.*)$/, (m) => `你的 ${m[2]} 个来源中有 ${m[1]} 个把${names(m[3])}排第一${m[4].replace(/^ \((.+)\)\.$/, (x, a) => `（${srcZh(a)}）。`).replace(/^\.$/, "。")}`],
  [/^Your (skills test|preferences|CV and tools) result points to (.+), but your (skills test|preferences|CV and tools) result points to (.+)\.$/, (m) => `你的${srcZh(m[1])}结果指向${names(m[2])}，但你的${srcZh(m[3])}结果指向${names(m[4])}。`],
  [/^Only your (skills test|preferences|CV and tools) result was used\. Add the other parts for a more reliable result\.$/, (m) => `只用到你的${srcZh(m[1])}结果。加入其他部分，结果会更可靠。`],
  // planText on the test intro
  [/ — we'll check /, (m) => planZh(m.input)],
  // results page
  [/^Match score = (\d+)% fit with the role's IT area \+ (\d+)% interest fit with the role \+ (\d+)% skill fit \+ (\d+)% AI-era trend of the role\. The weights are the team's design choice\. Roles are ranked by match score, highest first\. Roles that need a higher qualification than yours, or a professional licence, are not shown\.$/,
    (m) => `匹配分 = ${m[1]}% 职位所属 IT 领域契合度 + ${m[2]}% 与职位的兴趣契合度 + ${m[3]}% 技能契合度 + ${m[4]}% 职位的 AI 时代趋势。权重由团队设计。职位按匹配分从高到低排列。需要比你更高学历或专业执照的职位不会显示。`],
  [/^Each IT area is placed by your interest \(from the questionnaire\) and your skill \(your skills test and CV evidence\)\. "High" means among your top (\d+)\.$/,
    (m) => `每个 IT 领域按你的兴趣（来自问卷）和技能（来自技能测验和履历证据）分组。“高”指排在你的前 ${m[1]} 名。`],
  [/^Your top (\d+) areas\. Their roles are listed below\.$/, (m) => `你的前 ${m[1]} 个领域，其职位列在下面。`],
  [/^Trend score weights: Malaysian demand (\d+)% · AI momentum (\d+)%\. Area scores: (.+)\. An area with only one measured part keeps the same score\.$/,
    (m) => `趋势分权重：马来西亚需求 ${m[1]}% · AI 势头 ${m[2]}%。领域分数：${names(m[3])}。只有一个部分有数据的领域，分数保持不变。`],
  [/^(\d+) hours$/, (m) => `${m[1]} 小时`],
  [/^(\d+)\. (.+?)\s*$/, (m) => (ROLES_ZH[m[2]] ? `${m[1]}. ${ROLES_ZH[m[2]]}（${m[2]}） ` : null)],
  [/^(.+): how to get there$/, (m) => (ROLES_ZH[m[1]] ? `${ROLES_ZH[m[1]]}（${m[1]}）：怎么达到` : null)],
  [/^Learning path: (.+) →$/, (m) => `学习路径：${names(m[1])} →`],
  [/^Learning path · built on your skill gaps$/, () => "学习路径 · 根据你的技能差距"],
  [/^Match score ([\d.]+) out of 100$/, (m) => `匹配分 ${m[1]}（满分 100）`],
  [/^#(\d+)–(\d+) across 3 scenarios$/, (m) => `3 个情景中排第 ${m[1]}–${m[2]} 名`],
  [/^Rank under each future scenario: (.+)$/, (m) => `各未来情景下的排名：${m[1].replace("baseline", "当前趋势").replace("fast ai", "AI 快速普及").replace("local demand", "马来西亚需求主导")}`],
  [/^([▲▼]) (\d+) vs current trends$/, (m) => `${m[1]} ${m[2]}（相对当前趋势）`],
  [/^Needs further study \(Job Zone (\d)\)$/, (m) => `需要进修（Job Zone ${m[1]}）`],
  [/^SDG ([\d.]+) · (.+)$/, (m) => `SDG ${m[1]} · ${SDG_ZH[m[2]] || m[2]}`],
  [/^([\d.–]+) \/ 100 × weight (\d+)% = ([\d.–]+) points$/, (m) => `${m[1]} / 100 × 权重 ${m[2]}% = ${m[3]} 分`],
  [/^· importance ([\d.]+)\/5$/, (m) => `· 重要性 ${m[1]}/5`],
  [/^you ([\d.–]+) → needed ([\d.–]+) \(O\*NET level, 0–7\)$/, (m) => `你 ${m[1]} → 需要 ${m[2]}（O*NET 水平，0–7）`],
  [/^· you ([\d.–]+) → needed ([\d.–]+) \(O\*NET 0–7\)$/, (m) => `· 你 ${m[1]} → 需要 ${m[2]}（O*NET 0–7）`],
  [/^· not rated yet, needed ([\d.–]+) \(O\*NET 0–7\)$/, (m) => `· 尚未评估，需要 ${m[1]}（O*NET 0–7）`],
  [/^· (technology|skill)( · .+)?$/, (m) => `· ${ZH[m[1]]}${m[2] ? ` ${tr(m[2])}` : ""}`],
  [/^· not rated yet · needed ([\d.–]+) \(O\*NET 0–7\)$/, (m) => `· 尚未评估 · 需要 ${m[1]}（O*NET 0–7）`],
  [/^You already use: (.+)$/, (m) => `你已经在用：${m[1]}`],
  [/^Covers: (.+)$/, (m) => `涵盖：${m[1]}`],
  [/^(.+) · ([\d.]+ h|self-paced, no stated length) · (Free|RM \d+) · checked (.+)$/, (m) => `${m[1]} · ${m[2] === "self-paced, no stated length" ? ZH[m[2]] : m[2].replace(" h", " 小时")} · ${m[3] === "Free" ? "免费" : m[3]} · ${m[4]} 核实`],
  [/^(.+) · RM (\d+) · for (.+) · checked (.+)$/, (m) => `${m[1]} · RM ${m[2]} · 适用于 ${m[3]} · ${m[4]} 核实`],
  [/^No verified free course in our list yet for: (.+)\.$/, (m) => `以下技能在我们的清单中暂时没有核实过的免费课程：${m[1]}。`],
  [/^Working already\? (\d+) paid courses? your employer can claim under HRD Corp (are|is) on the full learning path page\.$/, (m) => `已经在工作？完整学习路径页上有 ${m[1]} 门可由雇主向 HRD Corp 申请补贴的付费课程。`],
  [/^Foundations for (.+)$/, (m) => `${names(m[1])}基础`],
  [/^Made for (.+)$/, (m) => `专为${names(m[1])}设计`],
  [/^(at \d+ hours a week.*?\.) (Everything here is free\..+)$/, (m) => `${tr(m[1])}${tr(m[2])}`],
  [/ · (?:self-paced|Free)(?: · |$)/, (m) => m.input.split(" · ").map((x, i) => (i === 0 ? x
    : { "self-paced": "自定进度", Free: "免费", beginner: "入门", intermediate: "中级", advanced: "高级" }[x]
      || x.replace(/^([\d.]+) h$/, "$1 小时"))).join(" · ")],
  [/^About$/, () => "约"],
  [/^([\d.]+) hours$/, (m) => `${m[1]} 小时`],
  [/^, or$/, () => "，或"],
  [/^([\d.]+) weeks$/, (m) => `${m[1]} 周`],
  [/^of free material, or$/, () => "的免费教材，或"],
  [/^at (\d+) hours a week(?: \(plus (\d+) self-paced resources?\))?\.$/, (m) => `（每周 ${m[1]} 小时${m[2] ? `，另有 ${m[2]} 项自定进度资源` : ""}）。`],
  [/^at (\d+) hours a week(?:, plus (\d+) self-paced courses?)?\.$/, (m) => `（每周 ${m[1]} 小时${m[2] ? `，另有 ${m[2]} 门自定进度课程` : ""}）。`],
  [/^Plus (\d+) more skills? without a free resource in our list yet\.$/, (m) => `另有 ${m[1]} 项技能在我们的清单中暂时没有免费资源。`],
  [/^This job \((\w+) link\): (.+)$/, (m) => `这份工作（${m[1]} 关联）：${m[2]}`],
  [/^(Also built|Built) by (\d+) skills? on this path:$/, (m) => `${m[1] === "Built" ? "" : "也"}由这条路径上的 ${m[2]} 项技能培养：`],
  [/^: rank (\d+) → (\d+)(.*)$/, (m) => `：排名 ${m[1]} → ${m[2]}${m[3].replace(", trend", "，趋势")}`],
  [/^\(computed (.+)\)\.$/, (m) => `（计算于 ${m[1]}）。`],
  [/^Updated (.*)\. Your jobs page will re-check your plan with the new data\.$/, (m) => `已于 ${m[1]} 更新。职位页会用新数据重新检查你的计划。`],
  [/^No data: (.+)$/, (m) => `没有数据：${m[1].replace("Malaysian demand", "马来西亚需求").replace("AI momentum", "AI 势头")}`],
  [/^Malaysian demand comes from the official MyCOL 2024\/2025 critical-occupations list \(TalentCorp\) and DOSM online job ads; AI momentum from arXiv paper counts \(global research\)\. Every signal lists its source and dates\. Scores computed (.+)\.$/,
    (m) => `马来西亚需求来自官方的 MyCOL 2024/2025 紧缺职业名单（TalentCorp）和 DOSM 网上招聘广告；AI 势头来自 arXiv 论文数量（全球研究）。每个信号都列出来源和日期。分数计算于 ${m[1]}。`],
  [/^released (.+) · fetched (.+)$/, (m) => `发布于 ${m[1]} · 获取于 ${m[2]}`],
  [/^(\d+) \/ (\d+) tests passed$/, (m) => `通过 ${m[1]} / ${m[2]} 项测试`],
  [/^The (\d+) tests your function must pass$/, (m) => `你的函数必须通过的 ${m[1]} 项测试`],
  [/^· Q(\d+) · (.+)$/, (m) => `· 第 ${m[1]} 题 · ${m[2]}`],
  // server text: area groups and insights
  [/^(.+\.) (Skill = .+\.)$/, (m) => `${tr(m[1])}${tr(m[2])}`],
  [/^· (.*(?:skills test|preferences|CV and tools).*)$/, (m) => `· ${srcZh(m[1]).replace(/questions/g, "题目").replace(/RIASEC fit/g, "RIASEC 契合度")}`],
  [/^Your (.+) (?:is|are both) in your top (\d+)\.|^Your .+ is in your top \d+, but your .+ is not\.$|^Neither your .+ nor your .+ is in your top \d+\.$/, (m) => groupWhyZh(m.input)],
  [/^Skill = (.+)\.$/, (m) => `技能 = ${srcZh(m[1])}。`],
  [/^· (.+)$/, (m) => (SDG_ZH[m[1]] || AREAS_ZH[m[1]] ? `· ${SDG_ZH[m[1]] || AREAS_ZH[m[1]]}` : null)],
];

function planZh(s) {
  const [said, rest] = s.split(" — we'll check ");
  const head = said
    .replace(/^You have not added a CV or answered the interest questions, so nothing narrows the test down yet/, "你还没加入履历或回答兴趣问题，所以测验还无法聚焦")
    .replace(/[Yy]our CV shows no IT area at (\d+) or more yet/, "你的履历还没有哪个 IT 领域达到 $1 分")
    .replace(/[Yy]our CV shows (.+?)(?=, your interests point to |; to compare |$)/, (x, l) => `你的履历显示${list(l)}`)
    .replace(/(^|, )[Yy]our interests point to (.+?)(?=; to compare |$)/, (x, sep, l) => `${sep ? "，" : ""}你的兴趣指向${list(l)}`)
    .replace(/; to compare at least (\d+) areas we add (.+)$/, (x, n, l) => `；为了至少比较 ${n} 个领域，我们加入${list(l)}`);
  const tail = rest.replace(/^all 6 areas/, "全部 6 个领域").replace(/^these (\d+) areas/, "这 $1 个领域")
    .replace(/ \((\d+) questions, about (\d+) minutes\)\.$/, "（$1 题，约 $2 分钟）。");
  return `${head}——我们会检查${tail}`;
}

function groupWhyZh(s) {
  const part = (x) => x.replace(/^interest not checked$/, "兴趣尚未检查").replace(/^skill not checked$/, "技能尚未检查")
    .replace(/^interest ([\d.]+) \(#(\d+) of (\d+)\)$/, "兴趣 $1（$3 个中排第 $2）").replace(/^skill ([\d.]+) \(#(\d+) of (\d+)\)$/, "技能 $1（$3 个中排第 $2）");
  let m;
  if ((m = s.match(/^Your (.+) and (.+) are both in your top (\d+)\.$/))) return `你的${part(m[1])}和${part(m[2])}都在前 ${m[3]} 名。`;
  if ((m = s.match(/^Your (.+) is in your top (\d+), but your (.+) is not\.$/))) return `你的${part(m[1])}在前 ${m[2]} 名，但${part(m[3])}不在。`;
  if ((m = s.match(/^Your (.+) is in your top (\d+)\.$/))) return `你的${part(m[1])}在前 ${m[2]} 名。`;
  if ((m = s.match(/^Neither your (.+) nor your (.+) is in your top (\d+)\.$/))) return `你的${part(m[1])}和${part(m[2])}都不在前 ${m[3]} 名。`;
  return null;
}

const norm = (s) => s.replace(/\s+/g, " ").trim();
const tables = () => (LANG === "zh" ? [ZH, AREAS_ZH, ROLES_ZH, PATTERNS_ZH] : [MS, AREAS_MS, ROLES_MS, PATTERNS_MS]);
function tr(s) {
  const key = norm(s);
  if (!key) return s;
  const [dict, areas, roles, patterns] = tables();
  if (dict[key] !== undefined) return dict[key];
  if (areas[key]) return areas[key];
  if (roles[key]) return roles[key];
  for (const [re, fn] of patterns) {
    const m = key.match(re);
    if (m) { const out = fn(m); if (out) return out; }
  }
  return s;
}

// Area and role names that app.js draws itself (the radar chart wraps them over lines).
window.trName = (s) => (LANG === "en" ? s : (LANG === "zh" ? AREAS_ZH[s] || ROLES_ZH[s] : AREAS_MS[s] || ROLES_MS[s]) || s);

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
  if (LANG !== "en" && /[A-Za-z]/.test(key)) {
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
    const out = LANG !== "en" ? tr(saved[a]) : saved[a];
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
  document.documentElement.lang = LANG === "zh" ? "zh-Hans" : LANG;
  const pick = document.getElementById("lang");
  if (pick) pick.value = LANG;
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
  const pick = document.getElementById("lang");
  if (pick) pick.onchange = () => setLang(pick.value);
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
