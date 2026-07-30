import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';
import * as cheerio from 'cheerio';

// Путь к исполняемому файлу Chrome на Vercel
const exePath = process.env.VERCEL_ENV === 'production' 
  ? await chromium.executablePath()
  : '/usr/bin/google-chrome'; // Путь для локального теста (если тестируешь локально)

export default async function handler(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Не указан userId' });
  }

  let browser = null;
  let hasPremium = false;
  let hasRobloxPlus = false;

  try {
    // 1. ЗАПУСКАЕМ НЕВИДИМЫЙ БРАУЗЕР
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: exePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    // Имитируем реального пользователя
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 2. ПЕРЕХОДИМ НА СТРАНИЦУ ПРОФИЛЯ
    await page.goto(`https://www.roblox.com/users/${userId}/profile`, {
      waitUntil: 'networkidle2', // Ждем, пока прекратятся сетевые запросы
      timeout: 30000 // Таймаут 30 секунд
    });

    // 3. ЖДЕМ ДОПОЛНИТЕЛЬНО (чтобы скрипты точно отработали)
    await page.waitForTimeout(2000); // Ждем еще 2 секунды

    // 4. ПОЛУЧАЕМ HTML СТРАНИЦЫ (уже со всеми иконками)
    const html = await page.content();
    
    // Загружаем HTML в cheerio для удобного поиска по селекторам
    const $ = cheerio.load(html);

    // =========================================================================
    // ТОЧНАЯ ПРОВЕРКА ПО ТВОЕМУ СКРИНШОТУ (ищем классы)
    // Твой код: class="... icon icon-regular-roblox-plus ..."
    // =========================================================================
    const robloxPlusSpan = $('span.icon-regular-roblox-plus');
    
    if (robloxPlusSpan.length > 0) {
      hasRobloxPlus = true;
    }
    
    // Фоллбек: если классы изменились, ищем по aria-label
    if (!hasRobloxPlus && $('[aria-label="Roblox Plus subscriber"]').length > 0) {
      hasRobloxPlus = true;
    }

    // =========================================================================
    // ПРОВЕРКА ОБЫЧНОГО PREMIUM (Официального)
    // =========================================================================
    if ($('.icon-premium, .icon-premium-medium').length > 0 || $('[aria-label="Premium"]').length > 0) {
      hasPremium = true;
    }

    return res.status(200).json({
      userId: userId,
      hasPremium: hasPremium,
      hasRobloxPlus: hasRobloxPlus
    });

  } catch (error) {
    console.error('Ошибка Puppeteer:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера (ошибка браузера).', details: error.message });
  } finally {
    // ОБЯЗАТЕЛЬНО ЗАКРЫВАЕМ БРАУЗЕР
    if (browser !== null) {
      await browser.close();
    }
  }
}
