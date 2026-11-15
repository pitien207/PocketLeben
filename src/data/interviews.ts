import type { Localized } from '../i18n/localized'

/**
 * Question-and-answer mini-games (embassy interview, WG casting, Anmeldung form).
 * Each answer scores 0 (bad), 1 (ok) or 2 (great); the reaction shows briefly.
 */

export interface QaAnswer {
  text: Localized
  score: 0 | 1 | 2
  reaction: Localized
}

export interface QaQuestion {
  q: Localized
  answers: QaAnswer[]
}

export interface QaSet {
  title: Localized
  /** NPC id whose portrait asks the questions. */
  asker: string
  questions: QaQuestion[]
}

const a = (score: 0 | 1 | 2, vi: string, en: string, rVi: string, rEn: string): QaAnswer => ({
  text: { vi, en },
  score,
  reaction: { vi: rVi, en: rEn },
})
const q = (vi: string, en: string, answers: QaAnswer[]): QaQuestion => ({ q: { vi, en }, answers })

const GOOD = ['Gut.', 'Good.'] as const
const OK = ['Hmm, verstehe.', 'Hmm, I see.'] as const
const BAD = ['Das ist nicht überzeugend…', 'That is not convincing…'] as const

const SHARED_EMBASSY: QaQuestion[] = [
  q('„Sprechen Sie Deutsch?"', '“Do you speak German?”', [
    a(2, 'Ja, ich habe das B1-Zertifikat.', 'Ja, ich habe das B1-Zertifikat.', 'Sehr schön! (Rất tốt!)', 'Sehr schön! (Very nice!)'),
    a(1, 'Ein bisschen…', 'Ein bisschen…', OK[0], OK[1]),
    a(0, 'Yes, I speak English!', 'Yes, I speak English!', 'Auf Deutsch, bitte. (Nói tiếng Đức nhé.)', 'Auf Deutsch, bitte. (In German, please.)'),
  ]),
  q('„Haben Sie Verwandte in Deutschland?"', '“Do you have relatives in Germany?”', [
    a(2, 'Nein, aber eine Freundin wohnt in Berlin.', 'Nein, aber eine Freundin wohnt in Berlin.', GOOD[0], GOOD[1]),
    a(1, 'Nein.', 'Nein.', OK[0], OK[1]),
    a(0, 'Có ạ, cả họ hàng bên đó luôn!', 'Yes, my whole family is there!', 'Wirklich? (Thật không?)', 'Really?'),
  ]),
]

export const QA_SETS = {
  embassyAusbildung: {
    title: { vi: 'Phỏng vấn visa học nghề', en: 'Vocational training visa interview', de: 'Visumsinterview Ausbildung' },
    asker: 'officer',
    questions: [
      q('„Warum möchten Sie nach Deutschland?"', '“Why do you want to go to Germany?”', [
        a(2, 'Ich möchte eine Ausbildung in der Pflege machen.', 'Ich möchte eine Ausbildung in der Pflege machen.', GOOD[0], GOOD[1]),
        a(1, 'Weil Deutschland schön ist.', 'Weil Deutschland schön ist.', OK[0], OK[1]),
        a(0, 'Để đi du lịch ạ!', 'To travel around!', 'Dafür gibt es ein Touristenvisum. (Cái đó là visa du lịch.)', 'That would be a tourist visa.'),
      ]),
      q('„Wo werden Sie Ihre Ausbildung machen?"', '“Where will you do your training?”', [
        a(2, 'Im Pflegeheim Sonnenhof. Hier ist mein Vertrag.', 'Im Pflegeheim Sonnenhof. Hier ist mein Vertrag.', GOOD[0], GOOD[1]),
        a(1, 'Ich weiß es noch nicht genau.', 'Ich weiß es noch nicht genau.', OK[0], OK[1]),
        a(0, 'Ở đâu cũng được ạ.', 'Anywhere is fine.', BAD[0], BAD[1]),
      ]),
      q('„Wie finanzieren Sie sich?"', '“How will you support yourself?”', [
        a(2, 'Mit meiner Ausbildungsvergütung und meinem Sperrkonto.', 'Mit meiner Ausbildungsvergütung und meinem Sperrkonto.', GOOD[0], GOOD[1]),
        a(1, 'Bố mẹ em sẽ gửi tiền ạ.', 'My parents will send money.', OK[0], OK[1]),
        a(0, 'Em chưa nghĩ tới chuyện đó.', 'I haven’t thought about it.', BAD[0], BAD[1]),
      ]),
      q('„Warum gerade die Pflege?"', '“Why nursing care in particular?”', [
        a(2, 'Ich helfe gern Menschen, besonders älteren Menschen.', 'Ich helfe gern Menschen, besonders älteren Menschen.', 'Das ist schön. (Thật đáng quý.)', 'That’s lovely.'),
        a(1, 'Vì nghe nói lương ổn ạ.', 'I heard the pay is okay.', OK[0], OK[1]),
        a(0, 'Mẹ em bắt em đi ạ.', 'My mum made me.', BAD[0], BAD[1]),
      ]),
      q('„Was machen Sie nach der Ausbildung?"', '“What will you do after the training?”', [
        a(2, 'Ich möchte als Pflegefachkraft arbeiten und mich weiterbilden.', 'Ich möchte als Pflegefachkraft arbeiten und mich weiterbilden.', GOOD[0], GOOD[1]),
        a(1, 'Về Việt Nam mở quán cà phê ạ.', 'Go home and open a café.', OK[0], OK[1]),
        a(0, 'Dạ chưa biết ạ.', 'No idea yet.', BAD[0], BAD[1]),
      ]),
      ...SHARED_EMBASSY,
    ],
  },
  embassyStudium: {
    title: { vi: 'Phỏng vấn visa du học', en: 'Student visa interview', de: 'Visumsinterview Studium' },
    asker: 'officer',
    questions: [
      q('„Warum möchten Sie in Deutschland studieren?"', '“Why do you want to study in Germany?”', [
        a(2, 'Die Universitäten sind sehr gut und das Studium ist praxisnah.', 'Die Universitäten sind sehr gut und das Studium ist praxisnah.', GOOD[0], GOOD[1]),
        a(1, 'Vì miễn học phí ạ.', 'Because it’s tuition-free.', OK[0], OK[1]),
        a(0, 'Để qua đó đi làm kiếm tiền ạ.', 'To work and earn money.', BAD[0], BAD[1]),
      ]),
      q('„Welches Fach möchten Sie studieren?"', '“Which subject will you study?”', [
        a(2, 'Informatik. Ich habe eine Zulassung der Universität.', 'Informatik. Ich habe eine Zulassung der Universität.', GOOD[0], GOOD[1]),
        a(1, 'Etwas mit Technik.', 'Etwas mit Technik.', OK[0], OK[1]),
        a(0, 'Ngành nào cũng được ạ.', 'Any subject is fine.', BAD[0], BAD[1]),
      ]),
      q('„Wie finanzieren Sie Ihr Studium?"', '“How will you finance your studies?”', [
        a(2, 'Ich habe ein Sperrkonto mit dem nötigen Betrag.', 'Ich habe ein Sperrkonto mit dem nötigen Betrag.', GOOD[0], GOOD[1]),
        a(1, 'Em sẽ đi làm thêm ạ.', 'I’ll get a side job.', OK[0], OK[1]),
        a(0, 'Dạ chưa tính ạ.', 'Haven’t planned that.', BAD[0], BAD[1]),
      ]),
      q('„Haben Sie das APS-Zertifikat?"', '“Do you have the APS certificate?”', [
        a(2, 'Ja, hier bitte.', 'Ja, hier bitte.', GOOD[0], GOOD[1]),
        a(1, 'Ich habe es beantragt.', 'Ich habe es beantragt.', OK[0], OK[1]),
        a(0, 'APS là gì vậy ạ?', 'What is APS?', BAD[0], BAD[1]),
      ]),
      q('„Was machen Sie nach dem Studium?"', '“What will you do after your studies?”', [
        a(2, 'Ich möchte Berufserfahrung sammeln und dann entscheiden.', 'Ich möchte Berufserfahrung sammeln und dann entscheiden.', GOOD[0], GOOD[1]),
        a(1, 'Về nước làm cho công ty Đức ạ.', 'Go home and work for a German company.', OK[0], OK[1]),
        a(0, 'Dạ chưa biết ạ.', 'No idea yet.', BAD[0], BAD[1]),
      ]),
      ...SHARED_EMBASSY,
    ],
  },
  wgCasting: {
    title: { vi: 'WG-Casting (phỏng vấn ở ghép)', en: 'WG casting (flat-share interview)', de: 'WG-Casting' },
    asker: 'lena',
    questions: [
      q('„Wie stellst du dir das WG-Leben vor?" (Bạn hình dung sống chung thế nào?)', '“How do you picture life in a WG?”', [
        a(2, 'Zusammen kochen, aber auch Ruhe respektieren.', 'Cook together, but respect quiet time too.', 'Perfekt!', 'Perfect!'),
        a(1, 'Party jeden Abend!', 'Party every night!', 'Haha… jeden Abend?', 'Haha… every night?'),
        a(0, 'Em ở trong phòng suốt, không nói chuyện với ai.', 'I’ll stay in my room and talk to no one.', 'Okay… schade.', 'Okay… too bad.'),
      ]),
      q('„Wir haben einen Putzplan. Findest du das gut?" (Lịch dọn dẹp?)', '“We have a cleaning rota. Okay with that?”', [
        a(2, 'Ja klar, Ordnung muss sein!', 'Of course, order is order!', 'Ein echter Deutscher!', 'A true German!'),
        a(1, 'Wenn es sein muss…', 'If I must…', 'Hmm.', 'Hmm.'),
        a(0, 'Em không thích dọn dẹp lắm.', 'I don’t really like cleaning.', 'Oh nein…', 'Oh no…'),
      ]),
      q('„Kochst du gern?"', '“Do you like cooking?”', [
        a(2, 'Ja! Ich koche euch mal Phở.', 'Yes! I’ll make you phở.', 'Phở! Wann?!', 'Phở! When?!'),
        a(1, 'Em chủ yếu ăn mì tôm.', 'Mostly instant noodles.', 'Haha, kennen wir.', 'Haha, been there.'),
        a(0, 'Không, ngày nào em cũng gọi đồ ăn.', 'No, I order food every day.', 'Teuer…', 'Expensive…'),
      ]),
      q('„Was machst du in Deutschland?"', '“What are you doing in Germany?”', [
        a(2, 'Ich mache eine Ausbildung in der Pflege.', 'I’m training as a nurse.', 'Respekt!', 'Respect!'),
        a(1, 'Arbeiten und Deutsch lernen.', 'Working and learning German.', 'Cool.', 'Cool.'),
        a(0, 'Em cũng chưa biết nữa.', 'I don’t know yet.', 'Hmm…', 'Hmm…'),
      ]),
      q('„Welche Tonne ist für Plastik?" (Thùng rác nào cho nhựa?)', '“Which bin is for plastic?”', [
        a(2, 'Die gelbe Tonne!', 'The yellow bin!', 'Richtig!', 'Correct!'),
        a(1, 'Die blaue?', 'The blue one?', 'Fast. Blau ist Papier.', 'Close. Blue is paper.'),
        a(0, 'Bỏ chung hết một thùng ạ?', 'All in one bin?', 'NEIN!', 'NO!'),
      ]),
      q('„Wie oft hast du Besuch?"', '“How often do you have visitors?”', [
        a(2, 'Manchmal, und ich sage vorher Bescheid.', 'Sometimes, and I’ll tell you first.', 'Super.', 'Great.'),
        a(1, 'Fast nie.', 'Almost never.', 'Okay.', 'Okay.'),
        a(0, 'Mỗi ngày chục người ạ.', 'Ten people a day.', 'Bitte was?', 'Excuse me?'),
      ]),
    ],
  },
  anmeldung: {
    title: { vi: 'Tờ khai Anmeldung', en: 'The registration form', de: 'Anmeldeformular' },
    asker: 'clerk',
    questions: [
      q('„Familienname?" (Họ)', '“Surname?”', [
        a(2, 'Nguyễn', 'Nguyễn', 'Gut.', 'Good.'),
        a(1, 'Lan (đó là tên…)', 'Lan (that’s the first name…)', 'Das ist der Vorname. (Đó là tên.)', 'That’s the first name.'),
        a(0, 'Mẹ em ạ', 'My mum', 'Bitte?', 'Pardon?'),
      ]),
      q('„Geburtsort?" (Nơi sinh)', '“Place of birth?”', [
        a(2, 'Hà Nội, Vietnam', 'Hanoi, Vietnam', 'Gut.', 'Good.'),
        a(1, 'Bệnh viện ạ', 'A hospital', 'Welche Stadt? (Thành phố nào?)', 'Which city?'),
        a(0, 'Weiß ich nicht', 'I don’t know', 'Hmm.', 'Hmm.'),
      ]),
      q('„Einzugsdatum?" (Ngày dọn vào)', '“Move-in date?”', [
        a(2, 'Am Ersten dieses Monats.', 'On the first of this month.', 'Gut.', 'Good.'),
        a(1, 'Morgen vielleicht?', 'Maybe tomorrow?', 'Vielleicht? (Có lẽ?)', 'Maybe?'),
        a(0, 'Gestern? Oder heute?', 'Yesterday? Or today?', 'Na toll.', 'Great.'),
      ]),
      q('„Wohnungsgeberbestätigung?" (Giấy xác nhận của chủ nhà)', '“Landlord confirmation?”', [
        a(2, 'Hier, unterschrieben.', 'Here, signed.', 'Sehr gut!', 'Very good!'),
        a(1, 'Ich bringe sie später.', 'I’ll bring it later.', 'Ohne geht es nicht…', 'Can’t do it without…'),
        a(0, 'Was ist das?', 'What’s that?', 'Seufz. (Thở dài.)', 'Sigh.'),
      ]),
      q('„Religionszugehörigkeit?" (Tôn giáo — để tính thuế nhà thờ)', '“Religion? (for church tax)”', [
        a(2, 'Keine.', 'None.', 'Gut.', 'Good.'),
        a(2, 'Phật giáo.', 'Buddhist.', 'In Ordnung.', 'All right.'),
        a(1, 'Kirchensteuer?!', 'Church tax?!', 'Ja, die gibt es.', 'Yes, that exists.'),
      ]),
    ],
  },

  // --- Chapter 4: nursing exams --------------------------------------------------------
  zwischenpruefung: {
    title: { vi: 'Thi giữa khóa · Zwischenprüfung', en: 'Mid-term exam · Zwischenprüfung', de: 'Zwischenprüfung' },
    asker: 'pruefer',
    questions: [
      q('„Wann desinfizieren Sie die Hände?" (Khi nào sát khuẩn tay?)', '“When do you disinfect your hands?”', [
        a(2, 'Vor und nach jedem Kontakt mit Bewohnern.', 'Before and after every contact with a resident.', 'Richtig!', 'Correct!'),
        a(1, 'Wenn sie schmutzig aussehen.', 'When they look dirty.', 'Nicht nur dann…', 'Not only then…'),
        a(0, 'Einmal am Morgen reicht.', 'Once in the morning is enough.', 'Auf keinen Fall!', 'Absolutely not!'),
      ]),
      q('„Wie viel sollte ein Bewohner am Tag trinken?" (Một cụ nên uống bao nhiêu nước mỗi ngày?)', '“How much should a resident drink per day?”', [
        a(2, 'Etwa anderthalb Liter.', 'About one and a half litres.', 'Genau.', 'Exactly.'),
        a(1, 'Wenn er Durst hat.', 'When they are thirsty.', 'Ältere Menschen merken Durst oft nicht.', 'Older people often don’t notice thirst.'),
        a(0, 'Ein Glas reicht.', 'One glass is enough.', 'Viel zu wenig!', 'Far too little!'),
      ]),
      q('„Wie beugen Sie Dekubitus vor?" (Phòng loét do nằm lâu thế nào?)', '“How do you prevent pressure sores?”', [
        a(2, 'Regelmäßig umlagern und die Haut kontrollieren.', 'Reposition regularly and check the skin.', 'Sehr gut.', 'Very good.'),
        a(1, 'Mit einer weichen Decke.', 'With a soft blanket.', 'Das reicht nicht.', 'That’s not enough.'),
        a(0, 'Der Bewohner soll still liegen.', 'The resident should lie still.', 'Das Gegenteil!', 'The opposite!'),
      ]),
      q('„Was schreiben Sie in den Pflegebericht?" (Ghi gì vào sổ chăm sóc?)', '“What goes into the care report?”', [
        a(2, 'Alles Wichtige: Essen, Trinken, Veränderungen, Stürze.', 'Everything important: food, drink, changes, falls.', 'Richtig.', 'Correct.'),
        a(1, 'Nur wenn etwas Schlimmes passiert.', 'Only when something bad happens.', 'Auch Kleinigkeiten zählen.', 'Small things count too.'),
        a(0, 'Meine Meinung über die Bewohner.', 'My opinion of the residents.', 'Bitte sachlich bleiben!', 'Please stay factual!'),
      ]),
      q('„Ein Nachbar fragt nach Frau Hoffmanns Krankheit." (Hàng xóm hỏi về bệnh của bà Hoffmann.)', '“A neighbour asks about Mrs Hoffmann’s illness.”', [
        a(2, 'Das darf ich nicht sagen — Schweigepflicht.', 'I can’t say — confidentiality.', 'Perfekt.', 'Perfect.'),
        a(1, 'Fragen Sie bitte ihre Tochter.', 'Please ask her daughter.', 'Okay, aber sag einfach: Schweigepflicht.', 'Okay, but just say: confidentiality.'),
        a(0, 'Sie hat Diabetes und Demenz.', 'She has diabetes and dementia.', 'Das ist ein Verstoß!', 'That’s a breach!'),
      ]),
      q('„Ein Bewohner ist gestürzt. Was tun Sie zuerst?" (Một cụ bị ngã. Làm gì trước?)', '“A resident has fallen. What do you do first?”', [
        a(2, 'Ruhig bleiben, ansprechen, Hilfe holen.', 'Stay calm, talk to them, get help.', 'Genau so.', 'Exactly.'),
        a(1, 'Sofort hochheben.', 'Lift them up right away.', 'Vorsicht — erst prüfen!', 'Careful — check first!'),
        a(0, 'Weitergehen, er steht schon auf.', 'Walk on, they’ll get up.', 'Niemals!', 'Never!'),
      ]),
    ],
  },
  abschlusspruefung: {
    title: { vi: 'Thi tốt nghiệp · Abschlussprüfung', en: 'Final exam · Abschlussprüfung', de: 'Abschlussprüfung' },
    asker: 'pruefer',
    questions: [
      q('„Eine Bewohnerin mit Demenz sucht ihre Mutter." (Một cụ bị sa sút trí tuệ đi tìm mẹ.)', '“A resident with dementia is looking for her mother.”', [
        a(2, 'Ich bleibe ruhig, frage nach ihrer Mutter und höre zu.', 'I stay calm, ask about her mother and listen.', 'Sehr einfühlsam.', 'Very empathetic.'),
        a(1, 'Ich lenke sie mit dem Fernseher ab.', 'I distract her with the TV.', 'Geht, aber zuhören ist besser.', 'Okay, but listening is better.'),
        a(0, 'Ihre Mutter ist doch längst tot!', 'Your mother died long ago!', 'Das verletzt sie sehr.', 'That hurts her deeply.'),
      ]),
      q('„Normaler Blutdruck bei Erwachsenen?" (Huyết áp bình thường?)', '“Normal adult blood pressure?”', [
        a(2, 'Ungefähr 120 zu 80.', 'About 120 over 80.', 'Richtig.', 'Correct.'),
        a(1, 'Ungefähr 150 zu 100.', 'About 150 over 100.', 'Das ist zu hoch.', 'That’s too high.'),
        a(0, 'Ungefähr 60 zu 20.', 'About 60 over 20.', 'Oh nein!', 'Oh no!'),
      ]),
      q('„Wie übergeben Sie an die Spätschicht?" (Bàn giao cho ca chiều thế nào?)', '“How do you hand over to the late shift?”', [
        a(2, 'Kurz und klar: Situation, Hintergrund, Einschätzung, Empfehlung.', 'Short and clear: situation, background, assessment, recommendation.', 'Wie im Lehrbuch!', 'Textbook!'),
        a(1, 'Ich erzähle alles, was heute passiert ist.', 'I tell them everything that happened today.', 'Etwas zu lang.', 'A bit too long.'),
        a(0, 'Steht ja im Computer.', 'It’s in the computer.', 'Die Übergabe ist Pflicht!', 'Handover is mandatory!'),
      ]),
      q('„Herr Krause will nicht essen." (Ông Krause không chịu ăn.)', '“Mr Krause refuses to eat.”', [
        a(2, 'Ich frage nach dem Grund und biete etwas anderes an.', 'I ask why and offer something else.', 'Gut so.', 'Good.'),
        a(1, 'Ich versuche es später noch einmal.', 'I try again later.', 'Und dokumentieren!', 'And document it!'),
        a(0, 'Ich zwinge ihn.', 'I force him.', 'Auf keinen Fall!', 'Absolutely not!'),
      ]),
      q('„Wer gehört zum Team im Pflegeheim?" (Ai thuộc đội ngũ ở viện dưỡng lão?)', '“Who belongs to the care home team?”', [
        a(2, 'Pflege, Ärzte, Therapeuten, Küche und die Angehörigen.', 'Nurses, doctors, therapists, kitchen and relatives.', 'Genau — Teamarbeit!', 'Exactly — teamwork!'),
        a(1, 'Nur die Pflegekräfte.', 'Only the nurses.', 'Da fehlen viele.', 'Many are missing.'),
        a(0, 'Ich allein.', 'Just me.', 'Haha, nein.', 'Haha, no.'),
      ]),
      q('„Warum sind Sie Pflegefachkraft geworden?" (Vì sao bạn trở thành điều dưỡng?)', '“Why did you become a nurse?”', [
        a(2, 'Ich helfe gern Menschen und mag die Arbeit im Team.', 'I like helping people and working in a team.', 'Das merkt man!', 'It shows!'),
        a(1, 'Wegen des Visums.', 'Because of the visa.', 'Ehrlich… aber hoffentlich nicht nur.', 'Honest… but hopefully not only that.'),
        a(0, 'Keine Ahnung.', 'No idea.', 'Hmm…', 'Hmm…'),
      ]),
      q('„Ein Bewohner hat plötzlich Fieber." (Một cụ đột nhiên bị sốt.)', '“A resident suddenly has a fever.”', [
        a(2, 'Messen, dokumentieren und den Arzt informieren.', 'Measure, document and inform the doctor.', 'Richtig.', 'Correct.'),
        a(1, 'Ein Fenster öffnen.', 'Open a window.', 'Das allein reicht nicht.', 'That alone isn’t enough.'),
        a(0, 'Morgen schauen wir mal.', 'We’ll see tomorrow.', 'Zu spät!', 'Too late!'),
      ]),
    ],
  },

  // --- Chapter 4A: university --------------------------------------------------------------
  vorlesung: {
    title: { vi: 'Bài giảng · Vorlesung', en: 'Lecture · Vorlesung', de: 'Vorlesung' },
    asker: 'profSchulz',
    questions: [
      q('„Was sind die vier Schritte des Pflegeprozesses?" (4 bước của quy trình điều dưỡng?)', '“What are the four steps of the nursing process?”', [
        a(2, 'Einschätzen, Planen, Handeln, Evaluieren.', 'Assess, plan, act, evaluate.', 'Sehr gut!', 'Very good!'),
        a(1, 'Waschen, Essen, Schlafen, Wiederholen.', 'Wash, eat, sleep, repeat.', 'Haha, nicht ganz.', 'Haha, not quite.'),
        a(0, 'Ich habe nicht zugehört.', 'I wasn’t listening.', 'Das merke ich.', 'I can tell.'),
      ]),
      q('„Was bedeutet Prävention?" (Phòng ngừa nghĩa là gì?)', '“What does prevention mean?”', [
        a(2, 'Krankheiten vorbeugen, bevor sie entstehen.', 'Stopping illness before it starts.', 'Genau.', 'Exactly.'),
        a(1, 'Krankheiten behandeln.', 'Treating illness.', 'Das ist Therapie.', 'That’s therapy.'),
        a(0, 'Eine Prüfung.', 'An exam.', 'Nein…', 'No…'),
      ]),
      q('„Warum ist Kommunikation in der Pflege wichtig?" (Vì sao giao tiếp quan trọng?)', '“Why is communication important in nursing?”', [
        a(2, 'Weil Vertrauen die Pflege leichter macht.', 'Trust makes care easier.', 'Wunderbar.', 'Wonderful.'),
        a(1, 'Damit es nicht so still ist.', 'So it’s not so quiet.', 'Auch, ja…', 'That too…'),
        a(0, 'Ist sie nicht.', 'It isn’t.', 'Oh doch!', 'Oh yes it is!'),
      ]),
      q('„Was ist evidenzbasierte Pflege?" (Điều dưỡng dựa trên bằng chứng là gì?)', '“What is evidence-based nursing?”', [
        a(2, 'Pflege nach dem besten Wissen aus der Forschung.', 'Care based on the best research.', 'Richtig.', 'Correct.'),
        a(1, 'Pflege nach Gefühl.', 'Care by gut feeling.', 'Gefühl allein reicht nicht.', 'Feeling alone isn’t enough.'),
        a(0, 'Pflege mit Beweisfotos.', 'Care with photo evidence.', 'Hmm, nein.', 'Hmm, no.'),
      ]),
      q('„Wie viele Menschen in Deutschland sind pflegebedürftig?" (Ở Đức có bao nhiêu người cần chăm sóc?)', '“How many people in Germany need long-term care?”', [
        a(2, 'Etwa fünf Millionen.', 'About five million.', 'Ja — deshalb brauchen wir Sie!', 'Yes — that’s why we need you!'),
        a(1, 'Etwa fünfzigtausend.', 'About fifty thousand.', 'Viel mehr!', 'Far more!'),
        a(0, 'Niemand.', 'Nobody.', 'Leider falsch.', 'Sadly wrong.'),
      ]),
      q('„Was machen Sie bei Fragen nach der Vorlesung?" (Có câu hỏi sau giờ học thì làm gì?)', '“What do you do with questions after the lecture?”', [
        a(2, 'Ich komme in die Sprechstunde.', 'I come to office hours.', 'Gern!', 'Please do!'),
        a(1, 'Ich frage ChatGPT.', 'I ask a chatbot.', 'Hmm, prüfen Sie es nach!', 'Hmm, double-check it!'),
        a(0, 'Ich gebe auf.', 'I give up.', 'Nicht doch!', 'Don’t!'),
      ]),
    ],
  },
  klausur: {
    title: { vi: 'Thi học kỳ · Klausur', en: 'Semester exam · Klausur', de: 'Klausur' },
    asker: 'profSchulz',
    questions: [
      q('„Nennen Sie ein Ziel der aktivierenden Pflege." (Mục tiêu của chăm sóc kích hoạt?)', '“Name a goal of activating care.”', [
        a(2, 'Die Selbstständigkeit der Bewohner erhalten.', 'Keeping residents independent.', 'Richtig.', 'Correct.'),
        a(1, 'Alles für die Bewohner erledigen.', 'Doing everything for them.', 'Gerade nicht!', 'Exactly not!'),
        a(0, 'Schneller fertig werden.', 'Finishing faster.', 'Nein.', 'No.'),
      ]),
      q('„Was ist ein Expertenstandard?" (Tiêu chuẩn chuyên gia là gì?)', '“What is an expert standard?”', [
        a(2, 'Eine Leitlinie für gute Pflegepraxis, z. B. Sturzprophylaxe.', 'A guideline for good practice, e.g. fall prevention.', 'Sehr gut.', 'Very good.'),
        a(1, 'Ein Zeugnis für Experten.', 'A certificate for experts.', 'Nicht ganz.', 'Not quite.'),
        a(0, 'Ein Kaffeeautomat.', 'A coffee machine.', 'Leider nein.', 'Sadly no.'),
      ]),
      q('„Wozu dient der Body-Mass-Index?" (Chỉ số BMI dùng để làm gì?)', '“What is the body mass index for?”', [
        a(2, 'Um das Gewicht im Verhältnis zur Größe einzuschätzen.', 'To assess weight relative to height.', 'Richtig.', 'Correct.'),
        a(1, 'Um die Körpergröße zu messen.', 'To measure height.', 'Nur halb.', 'Only half.'),
        a(0, 'Für den Blutdruck.', 'For blood pressure.', 'Falsch.', 'Wrong.'),
      ]),
      q('„Was gehört zur Sturzprophylaxe?" (Phòng ngừa té ngã gồm gì?)', '“What is part of fall prevention?”', [
        a(2, 'Gute Beleuchtung, feste Schuhe, keine Stolperfallen.', 'Good light, sturdy shoes, no tripping hazards.', 'Genau.', 'Exactly.'),
        a(1, 'Die Bewohner im Bett lassen.', 'Keeping residents in bed.', 'Das schadet eher.', 'That does harm.'),
        a(0, 'Glatte Böden.', 'Slippery floors.', 'Oh nein!', 'Oh no!'),
      ]),
      q('„Was ist Palliativpflege?" (Chăm sóc giảm nhẹ là gì?)', '“What is palliative care?”', [
        a(2, 'Lebensqualität und Würde am Lebensende.', 'Quality of life and dignity at the end of life.', 'Sehr einfühlsam.', 'Very thoughtful.'),
        a(1, 'Eine Operation.', 'An operation.', 'Nein.', 'No.'),
        a(0, 'Pflege nur am Wochenende.', 'Care only at weekends.', 'Falsch.', 'Wrong.'),
      ]),
      q('„Wie zitieren Sie eine Quelle?" (Trích dẫn nguồn thế nào?)', '“How do you cite a source?”', [
        a(2, 'Autor, Jahr, Titel — und im Literaturverzeichnis.', 'Author, year, title — and in the bibliography.', 'Wissenschaftlich!', 'Scholarly!'),
        a(1, 'Ich schreibe „Internet".', 'I write “internet”.', 'Zu ungenau.', 'Too vague.'),
        a(0, 'Gar nicht.', 'I don’t.', 'Das ist ein Plagiat!', 'That’s plagiarism!'),
      ]),
    ],
  },
  bachelorDefense: {
    title: { vi: 'Bảo vệ luận văn cử nhân', en: 'Bachelor thesis defence', de: 'Verteidigung der Bachelorarbeit' },
    asker: 'profSchulz',
    questions: [
      q('„Worum geht es in Ihrer Arbeit?" (Luận văn của bạn về đề tài gì?)', '“What is your thesis about?”', [
        a(2, 'Um Pflege von Menschen mit Demenz und kultursensible Kommunikation.', 'Dementia care and culturally sensitive communication.', 'Spannend!', 'Exciting!'),
        a(1, 'Um Pflege… allgemein.', 'About care… in general.', 'Etwas genauer, bitte.', 'More precisely, please.'),
        a(0, 'Das habe ich vergessen.', 'I forgot.', 'Oh je…', 'Oh dear…'),
      ]),
      q('„Welche Methode haben Sie verwendet?" (Bạn dùng phương pháp nào?)', '“Which method did you use?”', [
        a(2, 'Interviews mit Pflegekräften und eine Literaturrecherche.', 'Interviews with nurses and a literature review.', 'Solide.', 'Solid.'),
        a(1, 'Ich habe meine Freunde gefragt.', 'I asked my friends.', 'Nicht sehr wissenschaftlich.', 'Not very scientific.'),
        a(0, 'Keine.', 'None.', 'Hmm…', 'Hmm…'),
      ]),
      q('„Was ist Ihr wichtigstes Ergebnis?" (Kết quả quan trọng nhất?)', '“What is your key finding?”', [
        a(2, 'Wer die Biografie kennt, pflegt ruhiger und besser.', 'Knowing a resident’s life story makes care calmer and better.', 'Sehr praxisnah!', 'Very practical!'),
        a(1, 'Pflege ist anstrengend.', 'Care is exhausting.', 'Das wussten wir schon.', 'We knew that.'),
        a(0, 'Es gibt keins.', 'There isn’t one.', 'Schade.', 'A pity.'),
      ]),
      q('„Was würden Sie beim nächsten Mal anders machen?" (Lần sau bạn sẽ làm khác gì?)', '“What would you do differently next time?”', [
        a(2, 'Mehr Interviews führen und früher anfangen.', 'Do more interviews and start earlier.', 'Ehrlich und klug.', 'Honest and wise.'),
        a(1, 'Nichts, alles war perfekt.', 'Nothing, it was perfect.', 'Selbstbewusst…', 'Confident…'),
        a(0, 'Ein anderes Studium wählen.', 'Choose another degree.', 'Oh!', 'Oh!'),
      ]),
      q('„Wie nutzen Sie das in der Praxis?" (Áp dụng vào thực tế thế nào?)', '“How will you use this in practice?”', [
        a(2, 'Ich stelle es im Team in Sonnenhof vor.', 'I’ll present it to the team at Sonnenhof.', 'Ausgezeichnet!', 'Excellent!'),
        a(1, 'Mal sehen.', 'We’ll see.', 'Hmm.', 'Hmm.'),
        a(0, 'Gar nicht.', 'Not at all.', 'Schade.', 'A pity.'),
      ]),
    ],
  },

  // --- Chapter 5: career and residence -------------------------------------------------
  jobInterview: {
    title: { vi: 'Phỏng vấn hợp đồng chính thức', en: 'Job interview: permanent contract', de: 'Vorstellungsgespräch' },
    asker: 'heimleitung',
    questions: [
      q('„Warum möchten Sie bei uns bleiben?" (Vì sao muốn ở lại làm với chúng tôi?)', '“Why do you want to stay with us?”', [
        a(2, 'Ich kenne die Bewohner und das Team, und ich fühle mich hier wohl.', 'I know the residents and the team, and I feel at home here.', 'Das freut mich.', 'I’m glad to hear that.'),
        a(1, 'Ich habe noch nichts anderes gefunden.', 'I haven’t found anything else yet.', 'Hm, ehrlich…', 'Hm, honest…'),
        a(0, 'Wegen der Kaffeemaschine.', 'Because of the coffee machine.', 'Die ist wirklich gut, aber…', 'It is good, but…'),
      ]),
      q('„Können Sie im Schichtdienst arbeiten, auch am Wochenende?" (Làm theo ca, cả cuối tuần được không?)', '“Can you work shifts, weekends included?”', [
        a(2, 'Ja, kein Problem. Ich bin flexibel.', 'Yes, no problem. I’m flexible.', 'Super.', 'Great.'),
        a(1, 'Lieber nicht am Sonntag.', 'Preferably not on Sundays.', 'Das können wir besprechen.', 'We can discuss that.'),
        a(0, 'Nur von neun bis zwölf.', 'Only nine to twelve.', 'Das wird schwierig.', 'That will be difficult.'),
      ]),
      q('„Was sind Ihre Stärken?" (Điểm mạnh của bạn?)', '“What are your strengths?”', [
        a(2, 'Ich bin geduldig, zuverlässig und lerne schnell.', 'I’m patient, reliable and learn fast.', 'Das habe ich gesehen.', 'I’ve seen that.'),
        a(1, 'Ich koche gut Phở.', 'I cook great phở.', 'Das Team freut sich bestimmt!', 'The team will love that!'),
        a(0, 'Ich habe keine.', 'I don’t have any.', 'Seien Sie nicht so bescheiden!', 'Don’t be so modest!'),
      ]),
      q('„Was ist Ihre Gehaltsvorstellung?" (Mức lương mong muốn?)', '“What salary do you expect?”', [
        a(2, 'Nach Tarif, wie für Pflegefachkräfte üblich.', 'The standard pay scale for qualified nurses.', 'Fair.', 'Fair.'),
        a(1, 'So viel wie möglich!', 'As much as possible!', 'Haha, verständlich.', 'Haha, understandable.'),
        a(0, 'Egal, ich arbeite auch gratis.', 'Whatever, I’ll work for free.', 'Das dürfen wir gar nicht!', 'We’re not even allowed to!'),
      ]),
      q('„Haben Sie Fragen an uns?" (Bạn có câu hỏi gì không?)', '“Do you have any questions for us?”', [
        a(2, 'Ja: Gibt es Weiterbildungen, zum Beispiel für Wundpflege?', 'Yes: are there courses, e.g. in wound care?', 'Sehr gute Frage!', 'Very good question!'),
        a(1, 'Wann ist Mittagspause?', 'When is lunch break?', 'Um zwölf.', 'At twelve.'),
        a(0, 'Nein. Darf ich gehen?', 'No. Can I go?', 'Äh… ja.', 'Er… yes.'),
      ]),
    ],
  },
  lebenInDeutschland: {
    title: { vi: 'Bài thi „Leben in Deutschland“', en: '“Life in Germany” test', de: 'Test „Leben in Deutschland“' },
    asker: 'clerk',
    questions: [
      q('„Wie viele Bundesländer hat Deutschland?" (Đức có bao nhiêu bang?)', '“How many federal states does Germany have?”', [
        a(2, '16', '16', 'Richtig.', 'Correct.'),
        a(0, '12', '12', 'Falsch.', 'Wrong.'),
        a(0, '20', '20', 'Falsch.', 'Wrong.'),
      ]),
      q('„Welche Farben hat die deutsche Flagge?" (Cờ Đức có màu gì?)', '“What colours is the German flag?”', [
        a(2, 'Schwarz, Rot, Gold', 'Black, red, gold', 'Richtig.', 'Correct.'),
        a(0, 'Rot, Weiß, Blau', 'Red, white, blue', 'Das ist eine andere Flagge.', 'That’s another flag.'),
        a(0, 'Schwarz, Weiß, Rot', 'Black, white, red', 'Falsch.', 'Wrong.'),
      ]),
      q('„Was steht in Artikel 1 des Grundgesetzes?" (Điều 1 Hiến pháp Đức nói gì?)', '“What does Article 1 of the Basic Law say?”', [
        a(2, 'Die Würde des Menschen ist unantastbar.', 'Human dignity shall be inviolable.', 'Richtig.', 'Correct.'),
        a(0, 'Alle müssen Deutsch sprechen.', 'Everyone must speak German.', 'Falsch.', 'Wrong.'),
        a(0, 'Sonntags sind alle Läden zu.', 'All shops are closed on Sundays.', 'Haha — stimmt fast, aber nein.', 'Haha — almost true, but no.'),
      ]),
      q('„Wann fiel die Berliner Mauer?" (Bức tường Berlin sụp đổ năm nào?)', '“When did the Berlin Wall fall?”', [
        a(2, '1989', '1989', 'Richtig.', 'Correct.'),
        a(0, '1945', '1945', 'Falsch.', 'Wrong.'),
        a(0, '2001', '2001', 'Falsch.', 'Wrong.'),
      ]),
      q('„Wer wählt den Bundeskanzler?" (Ai bầu Thủ tướng Liên bang?)', '“Who elects the Federal Chancellor?”', [
        a(2, 'Der Bundestag', 'The Bundestag', 'Richtig.', 'Correct.'),
        a(0, 'Das Volk direkt', 'The people directly', 'Nein, indirekt.', 'No, indirectly.'),
        a(0, 'Der Bundespräsident allein', 'The Federal President alone', 'Falsch.', 'Wrong.'),
      ]),
      q('„Wie oft wird der Bundestag gewählt?" (Bao lâu bầu Quốc hội một lần?)', '“How often is the Bundestag elected?”', [
        a(2, 'Alle vier Jahre', 'Every four years', 'Richtig.', 'Correct.'),
        a(0, 'Jedes Jahr', 'Every year', 'Falsch.', 'Wrong.'),
        a(0, 'Alle zehn Jahre', 'Every ten years', 'Falsch.', 'Wrong.'),
      ]),
      q('„Was feiert man am 3. Oktober?" (Ngày 3/10 là ngày gì?)', '“What is celebrated on 3 October?”', [
        a(2, 'Den Tag der Deutschen Einheit', 'German Unity Day', 'Richtig.', 'Correct.'),
        a(0, 'Das Oktoberfest', 'Oktoberfest', 'Das ist in München, aber nein.', 'That’s in Munich, but no.'),
        a(0, 'Weihnachten', 'Christmas', 'Falsch.', 'Wrong.'),
      ]),
      q('„Ab welchem Alter darf man den Bundestag wählen?" (Bao nhiêu tuổi được bầu cử Quốc hội?)', '“From what age can you vote for the Bundestag?”', [
        a(2, 'Ab 18', 'From 18', 'Richtig.', 'Correct.'),
        a(0, 'Ab 14', 'From 14', 'Falsch.', 'Wrong.'),
        a(0, 'Ab 25', 'From 25', 'Falsch.', 'Wrong.'),
      ]),
    ],
  },
  einbuergerung: {
    title: { vi: 'Phỏng vấn nhập quốc tịch', en: 'Citizenship interview', de: 'Einbürgerungsgespräch' },
    asker: 'clerk',
    questions: [
      q('„Warum möchten Sie Deutsche oder Deutscher werden?" (Vì sao muốn nhập quốc tịch Đức?)', '“Why do you want to become German?”', [
        a(2, 'Hier ist jetzt mein Zuhause. Ich möchte auch wählen und mitbestimmen.', 'This is my home now. I want to vote and have a say.', 'Sehr schön gesagt.', 'Beautifully put.'),
        a(1, 'Wegen des Reisepasses.', 'For the passport.', 'Ehrlich…', 'Honest…'),
        a(0, 'Meine Freunde machen das auch.', 'My friends are doing it too.', 'Hm.', 'Hm.'),
      ]),
      q('„Bekennen Sie sich zur freiheitlichen demokratischen Grundordnung?" (Bạn cam kết tôn trọng trật tự dân chủ tự do?)', '“Do you commit to the free democratic basic order?”', [
        a(2, 'Ja, das tue ich.', 'Yes, I do.', 'Danke.', 'Thank you.'),
        a(1, 'Was heißt das genau?', 'What exactly does that mean?', 'Demokratie, Freiheit, Gleichberechtigung.', 'Democracy, freedom, equality.'),
        a(0, 'Nein.', 'No.', 'Dann geht es leider nicht.', 'Then it isn’t possible.'),
      ]),
      q('„Wie verdienen Sie Ihren Lebensunterhalt?" (Bạn tự trang trải cuộc sống thế nào?)', '“How do you earn your living?”', [
        a(2, 'Ich arbeite unbefristet als Pflegefachkraft.', 'I work on a permanent contract as a qualified nurse.', 'Sehr gut.', 'Very good.'),
        a(1, 'Mit Pfandflaschen, hauptsächlich.', 'Pfand bottles, mostly.', 'Hm… und sonst?', 'Hm… and otherwise?'),
        a(0, 'Meine Eltern schicken Geld.', 'My parents send money.', 'Das reicht leider nicht.', 'That’s not enough, sorry.'),
      ]),
      q('„Wie lange leben Sie schon in Deutschland?" (Bạn sống ở Đức bao lâu rồi?)', '“How long have you lived in Germany?”', [
        a(2, 'Seit einigen Jahren, mit Aufenthaltstitel.', 'For several years, with a residence permit.', 'Gut.', 'Good.'),
        a(1, 'Gefühlt ewig.', 'Feels like forever.', 'Haha.', 'Haha.'),
        a(0, 'Seit letzter Woche.', 'Since last week.', 'Das ist zu kurz.', 'That’s too short.'),
      ]),
      q('„Was gefällt Ihnen an Deutschland?" (Bạn thích gì ở nước Đức?)', '“What do you like about Germany?”', [
        a(2, 'Die Menschen, die Natur — und dass alles geregelt ist.', 'The people, the nature — and that everything has rules.', 'Typisch deutsch!', 'Typically German!'),
        a(1, 'Das Brot.', 'The bread.', 'Verständlich!', 'Understandable!'),
        a(0, 'Das Wetter.', 'The weather.', 'Wirklich?', 'Really?'),
      ]),
    ],
  },
} satisfies Record<string, QaSet>

export type QaSetId = keyof typeof QA_SETS
