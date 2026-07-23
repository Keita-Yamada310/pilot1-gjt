const jsPsych = initJsPsych({
  show_progress_bar: true,
  auto_update_progress_bar: false,
  message_progress_bar: "進捗",
  on_finish: function () {
    // 通常はDataPipe保存後の終了画面まで進むため、ここでは何もしません。
  }
});

let participantId = "";
let saveSucceeded = false;

function sanitizeId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);
}

function makeFilename() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return `${CONFIG.studyName}_${participantId}_${stamp}.csv`;
}

function downloadFallbackCsv() {
  const csv = jsPsych.data.get().csv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `FALLBACK_${makeFilename()}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const timeline = [];

timeline.push({
  type: jsPsychSurveyText,
  preamble: `
    <div class="instruction-box">
      <h1>英語文判断テスト</h1>
      <p>最初に参加者ID（半角で学科M/E/I/C/A・クラス番号）を入力してください。</p>
      <p class="small-note">氏名は入力しないでください。</p>
    </div>
  `,
  questions: [
    {
      prompt: "参加者ID",
      name: "participant_id",
      required: true
    }
  ],
  button_label: "次へ",
  on_finish: function(data) {
    const raw = data.response.participant_id;
    participantId = sanitizeId(raw);

    if (!participantId) {
      participantId = `unknown_${Date.now()}`;
    }

    jsPsych.data.addProperties({
      participant_id: participantId,
      study: CONFIG.studyName,
      browser_user_agent: navigator.userAgent,
      screen_width: window.screen.width,
      screen_height: window.screen.height
    });
  }
});

timeline.push({
  type: jsPsychFullscreen,
  fullscreen_mode: true,
  message: `
    <div class="instruction-box">
      <h2>全画面表示にします</h2>
      <p>課題中はブラウザを閉じたり、別の画面へ移動したりしないでください。</p>
    </div>
  `,
  button_label: "全画面で開始"
});

timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="instruction-box">
      <h2>説明</h2>
      <p>画面に英語の文が1文ずつ表示されます。</p>
      <p>英語として正しい文なら<strong>「正しい」</strong>、間違っている文なら<strong>「間違い」</strong>を選んでください。</p>
      <p>意味が現実的かどうかではなく、英語として正しいかどうかを判断してください。</p>
      <p>各文には<strong>10秒</strong>の制限時間があります。できるだけ正確かつ、早く回答してください。分からない場合も、できるだけ回答してください。</p>
      <p>最初に練習を2問行います。練習では回答後に正解が表示されます。</p>
    </div>
  `,
  choices: ["練習を始める"],
  data: { phase: "instruction" }
});

function createPracticeTrial(item, practiceIndex) {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div class="sentence">${item.sentence}</div>`,
    choices: ["正しい", "間違い"],
    trial_duration: CONFIG.trialDurationMs,
    response_ends_trial: true,
    data: {
      phase: "practice",
      item_id: item.item_id,
      sentence: item.sentence,
      correct_answer: item.correct_answer,
      error_type: item.error_type,
      presentation_order: practiceIndex + 1
    },
    on_finish: function(data) {
      data.response_label =
        data.response === 0 ? "grammatical" :
        data.response === 1 ? "ungrammatical" : null;
      data.timeout = data.response === null;
      data.accuracy = data.timeout ? 0 : Number(data.response_label === data.correct_answer);
    }
  };
}

function createPracticeFeedback() {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: function() {
      const last = jsPsych.data.get().last(1).values()[0];
      if (last.timeout) {
        return `<div class="feedback incorrect">時間切れです。正解は「${last.correct_answer === "grammatical" ? "正しい" : "間違い"}」です。</div>`;
      }
      return last.accuracy === 1
        ? `<div class="feedback correct">正解です。</div>`
        : `<div class="feedback incorrect">不正解です。正解は「${last.correct_answer === "grammatical" ? "正しい" : "間違い"}」です。</div>`;
    },
    choices: ["次へ"],
    data: { phase: "practice_feedback" }
  };
}

practiceItems.forEach((item, index) => {
  timeline.push(createPracticeTrial(item, index));
  timeline.push(createPracticeFeedback());
});

timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="instruction-box">
      <h2>本番を始めます</h2>
      <p>ここから30問です。</p>
      <p>本番では正解は表示されません。</p>
    </div>
  `,
  choices: ["開始"],
  data: { phase: "start_test" },
  on_finish: function() {
    jsPsych.progressBar.progress = 0;
  }
});

const randomizedTestItems = jsPsych.randomization.shuffle(testItems.slice());

randomizedTestItems.forEach((item, index) => {
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div class="sentence">${item.sentence}</div>`,
    choices: ["正しい", "間違い"],
    trial_duration: CONFIG.trialDurationMs,
    response_ends_trial: true,
    data: {
      phase: "test",
      item_id: item.item_id,
      sentence: item.sentence,
      correct_answer: item.correct_answer,
      error_type: item.error_type,
      presentation_order: index + 1
    },
    on_finish: function(data) {
      data.response_label =
        data.response === 0 ? "grammatical" :
        data.response === 1 ? "ungrammatical" : null;
      data.timeout = data.response === null;
      data.accuracy = data.timeout ? 0 : Number(data.response_label === data.correct_answer);
      data.rt_ms = data.rt;
     jsPsych.progressBar.progress =
  (index + 1) / randomizedTestItems.length;
    }
  });
});

timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="instruction-box">
      <h2>回答が終了しました</h2>
      <p>これからデータを送信します。</p>
      <p>送信完了の画面が出るまで、ブラウザを閉じないでください。</p>
    </div>
  `,
  choices: ["データを送信する"],
  data: { phase: "pre_save" }
});

timeline.push({
  type: jsPsychPipe,
  action: "save",
  experiment_id: CONFIG.experimentId,
  filename: () => makeFilename(),
  data_string: () => jsPsych.data.get().csv(),
  on_finish: function(data) {
    // plugin-pipeは成功時にsuccess=trueを返す版があります。
    // 明示的なfalseまたはエラー情報がある場合のみ、ローカル保存へ切り替えます。
    saveSucceeded = data.success !== false && !data.error;
    data.phase = "datapipe_save";
    data.save_succeeded = saveSucceeded;

    if (!saveSucceeded) {
      downloadFallbackCsv();
    }
  }
});

timeline.push({
  type: jsPsychFullscreen,
  fullscreen_mode: false,
  delay_after: 0
});

timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: function() {
    if (saveSucceeded) {
      return `
        <div class="instruction-box">
          <h2>終了です</h2>
          <p>データの送信が完了しました。</p>
          <p>ご協力ありがとうございました。</p>
        </div>
      `;
    }
    return `
      <div class="instruction-box">
        <h2>終了です</h2>
        <p>オンライン送信を確認できなかったため、CSVファイルを端末に保存しました。</p>
        <p>担当者の指示に従ってください。</p>
      </div>
    `;
  },
  choices: [],
  data: { phase: "end" }
});

if (
  !CONFIG.experimentId ||
  CONFIG.experimentId === "PASTE_YOUR_DATAPIPE_EXPERIMENT_ID_HERE"
) {
  document.body.innerHTML = `
    <div class="configuration-error">
      <h2>設定が完了していません</h2>
      <p>config.js の experimentId をDataPipeの実験IDに置き換えてください。</p>
    </div>
  `;
  throw new Error("DataPipe experiment ID is not configured.");
}

jsPsych.run(timeline);
