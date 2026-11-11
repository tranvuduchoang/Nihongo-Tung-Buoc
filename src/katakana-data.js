// Shared by the alphabet trainer and the printable/on-screen exercise bank.
export const KATAKANA_GROUPS = [
  {id: 'basic', name: 'Âm đơn', sample: 'ア', hint: 'Bảng chữ cái gốc', items: [
    ['ア','a'],['イ','i'],['ウ','u'],['エ','e'],['オ','o'],
    ['カ','ka'],['キ','ki'],['ク','ku'],['ケ','ke'],['コ','ko'],
    ['サ','sa'],['シ','shi','si'],['ス','su'],['セ','se'],['ソ','so'],
    ['タ','ta'],['チ','chi','ti'],['ツ','tsu','tu'],['テ','te'],['ト','to'],
    ['ナ','na'],['ニ','ni'],['ヌ','nu'],['ネ','ne'],['ノ','no'],
    ['ハ','ha'],['ヒ','hi'],['フ','fu','hu'],['ヘ','he'],['ホ','ho'],
    ['マ','ma'],['ミ','mi'],['ム','mu'],['メ','me'],['モ','mo'],
    ['ヤ','ya'],['ユ','yu'],['ヨ','yo'],
    ['ラ','ra'],['リ','ri'],['ル','ru'],['レ','re'],['ロ','ro'],
    ['ワ','wa'],['ヲ','wo'],['ン','n']
  ]},
  {id: 'voiced', name: 'Âm có dấu biến âm', sample: 'ガ', hint: 'ガ ザ ダ バ パ ヴ', items: [
    ['ガ','ga'],['ギ','gi'],['グ','gu'],['ゲ','ge'],['ゴ','go'],
    ['ザ','za'],['ジ','ji','zi'],['ズ','zu'],['ゼ','ze'],['ゾ','zo'],
    ['ダ','da'],['ヂ','dji','ji','di'],['ヅ','dzu','zu','du'],['デ','de'],['ド','do'],
    ['バ','ba'],['ビ','bi'],['ブ','bu'],['ベ','be'],['ボ','bo'],
    ['パ','pa'],['ピ','pi'],['プ','pu'],['ペ','pe'],['ポ','po'],['ヴ','vu']
  ]},
  {id: 'combo', name: 'Âm ghép', sample: 'キャ', hint: 'キャ シャ チャ ニャ', items: [
    ['キャ','kya'],['キュ','kyu'],['キョ','kyo'],
    ['シャ','sha','sya'],['シュ','shu','syu'],['ショ','sho','syo'],
    ['チャ','cha','tya','cya'],['チュ','chu','tyu','cyu'],['チョ','cho','tyo','cyo'],
    ['ニャ','nya'],['ニュ','nyu'],['ニョ','nyo'],
    ['ヒャ','hya'],['ヒュ','hyu'],['ヒョ','hyo'],
    ['ミャ','mya'],['ミュ','myu'],['ミョ','myo'],
    ['リャ','rya'],['リュ','ryu'],['リョ','ryo']
  ]},
  {id: 'voiced-combo', name: 'Âm ghép biến âm', sample: 'ギャ', hint: 'ギャ ジャ ビャ ピャ', items: [
    ['ギャ','gya'],['ギュ','gyu'],['ギョ','gyo'],
    ['ジャ','ja','zya','jya'],['ジュ','ju','zyu','jyu'],['ジョ','jo','zyo','jyo'],
    ['ヂャ','ja','dya','dja'],['ヂュ','ju','dyu','dju'],['ヂョ','jo','dyo','djo'],
    ['ビャ','bya'],['ビュ','byu'],['ビョ','byo'],
    ['ピャ','pya'],['ピュ','pyu'],['ピョ','pyo']
  ]},
  {id: 'loanword', name: 'Âm trong từ mượn', sample: 'ファ', hint: 'ファ ティ ウィ ヴァ', items: [
    ['ティ','ti'],['ディ','di'],['トゥ','tu'],['ドゥ','du'],
    ['ファ','fa'],['フィ','fi'],['フェ','fe'],['フォ','fo'],
    ['ウィ','wi'],['ウェ','we'],['ウォ','wo'],
    ['ヴァ','va'],['ヴィ','vi'],['ヴェ','ve'],['ヴォ','vo'],
    ['シェ','she'],['ジェ','je'],['チェ','che'],
    ['ツァ','tsa'],['ツィ','tsi'],['ツェ','tse'],['ツォ','tso'],
    ['クァ','kwa'],['グァ','gwa']
  ]}
];

export const KATAKANA_WORDS = [
  {kana:'コーヒー', romaji:'koohii', romajiVariants:['kōhī'], meaning:'cà phê', note:'Dấu ー kéo dài nguyên âm o và i.'},
  {kana:'テレビ', romaji:'terebi', meaning:'tivi', meaningVariants:['ti vi','máy truyền hình']},
  {kana:'バス', romaji:'basu', meaning:'xe buýt', meaningVariants:['xe bus']},
  {kana:'タクシー', romaji:'takushii', romajiVariants:['takushī'], meaning:'taxi', meaningVariants:['xe taxi']},
  {kana:'ホテル', romaji:'hoteru', meaning:'khách sạn'},
  {kana:'レストラン', romaji:'resutoran', meaning:'nhà hàng'},
  {kana:'コンビニ', romaji:'konbini', meaning:'cửa hàng tiện lợi'},
  {kana:'スーパー', romaji:'suupaa', romajiVariants:['sūpā'], meaning:'siêu thị'},
  {kana:'パン', romaji:'pan', meaning:'bánh mì'},
  {kana:'アイスクリーム', romaji:'aisukuriimu', romajiVariants:['aisukurīmu'], meaning:'kem', note:'Có hai dấu ー kéo dài nguyên âm.'},
  {kana:'ケーキ', romaji:'keeki', romajiVariants:['kēki'], meaning:'bánh ngọt', meaningVariants:['bánh kem']},
  {kana:'カメラ', romaji:'kamera', meaning:'máy ảnh'},
  {kana:'パソコン', romaji:'pasokon', meaning:'máy tính cá nhân'},
  {kana:'スマホ', romaji:'sumaho', meaning:'điện thoại thông minh', meaningVariants:['điện thoại smartphone']},
  {kana:'インターネット', romaji:'intaanetto', meaning:'mạng Internet', meaningVariants:['internet']},
  {kana:'コンピューター', kanaVariants:['コンピュータ'], romaji:'konpyuutaa', romajiVariants:['konpyūtā'], meaning:'máy tính'},
  {kana:'メニュー', romaji:'menyuu', romajiVariants:['menyū'], meaning:'thực đơn', meaningVariants:['menu']},
  {kana:'トイレ', romaji:'toire', meaning:'nhà vệ sinh', meaningVariants:['toilet']},
  {kana:'エレベーター', romaji:'erebeetaa', romajiVariants:['erebētā'], meaning:'thang máy'},
  {kana:'エアコン', romaji:'eakon', meaning:'máy điều hòa', meaningVariants:['điều hòa']},
  {kana:'ドア', romaji:'doa', meaning:'cửa ra vào', meaningVariants:['cánh cửa']},
  {kana:'ペン', romaji:'pen', meaning:'bút mực', meaningVariants:['bút']},
  {kana:'ノート', romaji:'nooto', romajiVariants:['nōto'], meaning:'vở ghi chép', meaningVariants:['quyển vở']},
  {kana:'ゲーム', romaji:'geemu', romajiVariants:['gēmu'], meaning:'trò chơi điện tử', meaningVariants:['game']},
  {kana:'アニメ', romaji:'anime', meaning:'phim hoạt hình Nhật', meaningVariants:['anime']},
  {kana:'サッカー', romaji:'sakkaa', romajiVariants:['sakkā'], meaning:'bóng đá', note:'ッ ngắt phụ âm k; ー kéo dài nguyên âm a.'},
  {kana:'ベッド', romaji:'beddo', meaning:'giường', note:'ッ ngắt phụ âm d, nên Romaji viết hai chữ d.'},
  {kana:'チケット', romaji:'chiketto', meaning:'vé', meaningVariants:['vé vào cửa'], note:'ッ ngắt phụ âm k, nên Romaji viết hai chữ k.'},
  {kana:'クッキー', romaji:'kukkii', romajiVariants:['kukkī'], meaning:'bánh quy', note:'ッ ngắt phụ âm k; ー kéo dài nguyên âm i.'},
  {kana:'ジュース', romaji:'juusu', romajiVariants:['jūsu'], meaning:'nước ép', meaningVariants:['nước trái cây']}
];
