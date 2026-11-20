import { test, expect, type Page } from '@playwright/test';

/** Headless Chrome on macOS can't open a (fake) microphone, so feed MediaRecorder a synthetic WebAudio stream. */
async function syntheticMic(page: Page) {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const ac = new AudioContext();
      const o = ac.createOscillator();
      const d = ac.createMediaStreamDestination();
      o.connect(d);
      o.start();
      return d.stream;
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('Reading mock test: keyboard answering, flag, reload resume, submit and review', async ({ page }) => {
  await page.clock.install();
  await page.goto('/#/reading/vlu-122/test');
  await page.getByRole('button', { name: 'Bắt đầu làm bài' }).click();
  await expect(page.getByRole('timer')).toHaveText(/60:00|59:59/);

  await page.keyboard.press('a');           // Q1 = A (correct)
  await page.keyboard.press('j');
  await page.keyboard.press('c');           // Q2 = C (correct)
  await page.keyboard.press('f');           // flag Q2
  await expect(page.getByRole('button', { name: /Câu 2, đã chọn C, đã đánh dấu/ })).toBeVisible();

  await page.clock.fastForward('10:00');
  await page.reload();
  await expect(page.getByRole('timer')).toHaveText(/^\s*50:0\d|49:5\d/);   // clock kept running across reload
  await expect(page.getByRole('button', { name: /Câu 1, đã chọn A/ })).toBeVisible();

  await page.getByRole('banner').getByRole('button', { name: 'Nộp bài' }).click();
  await expect(page.getByRole('dialog')).toContainText('38');           // 38 unanswered
  await page.getByRole('dialog').getByRole('button', { name: 'Nộp bài' }).click();

  await expect(page).toHaveURL(/#\/reading\/result\//);
  await expect(page.getByText('2 / 40')).toBeVisible();
  await expect(page.locator('text=0,5').first()).toBeVisible();
  await page.getByRole('button', { name: /Đánh dấu · 1/ }).click();
  await expect(page.locator('section[data-q="2"]')).toContainText('Đáp án C');
});

test('Reading auto-submits when the 60 minutes run out', async ({ page }) => {
  await page.clock.install();
  await page.goto('/#/reading/vlu-121/test');
  await page.getByRole('button', { name: 'Bắt đầu làm bài' }).click();
  await page.keyboard.press('b');
  await page.clock.fastForward('50:30');
  await expect(page.getByRole('status')).toContainText('Còn 10 phút');
  await page.clock.fastForward('10:00');
  await expect(page).toHaveURL(/#\/reading\/result\//);
  await expect(page.getByText('hết giờ')).toBeVisible();
});

test('Reading practice: check a passage reveals answers and explanations', async ({ page }) => {
  await page.goto('/#/reading/vlu-120/practice');
  await page.getByRole('button', { name: 'Bắt đầu làm bài' }).click();
  await page.getByRole('button', { name: 'Kiểm tra passage 1' }).click();
  await expect(page.getByText(/\d+\/10 đúng/)).toBeVisible();
  await expect(page.locator('section[data-q="1"]')).toContainText('Đáp án');
});

test('Writing: autosave survives reload, word count, submit and self-assess', async ({ page }) => {
  await page.goto('/#/writing/vlu-122/task1');
  await page.getByRole('button', { name: 'Bắt đầu viết' }).click();
  const ta = page.getByRole('textbox', { name: 'Bài viết Task 1' });
  await ta.fill('Dear Alex, I was thrilled to hear that you are coming to Vietnam.');
  await expect(page.getByText('Đã lưu')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Bài viết Task 1' })).toHaveValue(/thrilled/);
  await expect(page.getByText(/13\s*\/ 120 từ/)).toBeVisible();
  await page.getByRole('banner').getByRole('button', { name: 'Nộp bài' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Nộp bài' }).click();
  await expect(page).toHaveURL(/#\/writing\/review\//);
  await page.locator('input[type=range]').first().fill('8');
  await expect(page.getByText('Điểm Task 1')).toBeVisible();
});

test('Speaking mock test records three parts and plays them back', async ({ page }) => {
  await syntheticMic(page);
  await page.clock.install();
  await page.goto('/#/speaking/vlu-118/test');
  await page.getByRole('button', { name: 'Kiểm tra micro' }).click();
  await expect(page.getByText('Sẵn sàng')).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu thi' }).click();
  await expect(page.getByText('Đang ghi âm')).toBeVisible();
  await page.waitForTimeout(1500);            // MediaRecorder runs on real time
  await page.getByRole('button', { name: 'Kết thúc Part 1' }).click();
  await expect(page.getByText('Chuẩn bị')).toBeVisible();          // Part 2 starts with 1' prep
  await page.clock.fastForward('01:01');                            // prep ends automatically
  await expect(page.getByText('Đang ghi âm')).toBeVisible();
  await page.waitForTimeout(1500);            // MediaRecorder runs on real time
  await page.getByRole('button', { name: 'Kết thúc Part 2' }).click();
  await page.getByRole('button', { name: 'Bắt đầu nói ngay' }).click();
  await page.waitForTimeout(1500);            // MediaRecorder runs on real time
  await page.getByRole('button', { name: 'Kết thúc bài thi' }).click();
  await expect(page).toHaveURL(/#\/speaking\/review\//);
  await expect(page.locator('audio')).toHaveCount(3);
});

test('Model answers: list, detail with verbatim prompt and word count, print view', async ({ page }) => {
  await page.goto('/#/bai-mau');
  await expect(page.getByRole('heading', { name: 'Bài mẫu' })).toBeVisible();
  await page.getByRole('link', { name: /VLU 135/ }).click();
  await expect(page.getByRole('heading', { name: 'VLU 135 · Bài giải tham khảo' })).toBeVisible();
  await expect(page.getByText('Could you arrange a meeting with me?')).toBeVisible();      // verbatim email excerpt
  await expect(page.getByText(/\d+ từ \(đếm bằng công cụ\)/).first()).toBeVisible();
  await page.goto('/#/speaking/vlu-135');
  await page.getByRole('main').getByRole('link', { name: 'Bài mẫu' }).click();
  await expect(page).toHaveURL(/bai-mau\/vlu-135/);
  await page.goto('/#/in/bai-mau/vlu-135');
  await expect(page.locator('article')).toContainText('SPEAKING — PART 3');
});
