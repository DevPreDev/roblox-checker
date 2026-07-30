import * as cheerio from 'cheerio'; // Импортируем библиотеку для парсинга DOM

export default async function handler(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Не указан userId' });
  }

  // Настройка заголовков для максимальной имитации реального браузера (защита от блокировок)
  const fetchOptions = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Upgrade-Insecure-Requests': '1'
    }
  };

  try {
    // Делаем запрос к странице профиля
    const response = await fetch(`https://www.roblox.com/users/${userId}/profile`, fetchOptions);

    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        return res.status(503).json({ error: 'Roblox заблокировал запрос (Cloudflare/RateLimit). Попробуйте позже.' });
      }
      return res.status(404).json({ error: 'Пользователь не найден или страница недоступна.' });
    }

    const html = await response.text();
    
    // Загружаем HTML в cheerio для работы с DOM (как jQuery)
    const $ = cheerio.load(html);

    // =========================================================================
    // СЧЕТЧИКИ СПОСОБОВ ОБНАРУЖЕНИЯ
    // =========================================================================
    let premiumFoundBy = [];
    let rplusFoundBy = [];

    // =========================================================================
    // ТОЧНАЯ ПРОВЕРКА ROBLOX PREMIUM (Официальная иконка)
    // =========================================================================
    // Способ 1: Поиск по CSS классу иконки
    if ($('.icon-premium, .icon-premium-medium, .icon-premium-small').length > 0) {
      premiumFoundBy.push('css-class');
    }
    
    // Способ 2: Поиск по aria-label "Premium" (то, что на твоем скрине)
    if ($('[aria-label="Premium"], [aria-label^="Roblox Premium"]').length > 0) {
      premiumFoundBy.push('aria-label');
    }

    // Способ 3: Поиск в шапке профиля (обычно там есть текст "Premium subscriber")
    if ($('.profile-header').text().includes('Premium subscriber')) {
      premiumFoundBy.push('header-text');
    }

    // Способ 4: Фоллбек по регулярному выражению в сыром HTML (если верстка сломалась)
    const premiumRegex = /class=["'][^"']*icon-premium[^"']*["']|aria-label=["']Premium["']/i;
    if (!premiumFoundBy.length && premiumRegex.test(html)) {
      premiumFoundBy.push('regex-fallback');
    }


    // =========================================================================
    // ТОЧНАЯ ПРОВЕРКА ROBLOX PLUS (Стороннее расширение)
    // =========================================================================
    // Способ 1: Поиск по aria-label "Roblox Plus subscriber" (то, что на скрине расширения)
    if ($('[aria-label="Roblox Plus subscriber"], [aria-label="Roblox Plus"]').length > 0) {
      rplusFoundBy.push('aria-label');
    }

    // Способ 2: Поиск по CSS классам расширения
    if ($('.icon-roblox-plus, .icon-regular-roblox-plus, .roblox-plus-icon').length > 0) {
      rplusFoundBy.push('css-class');
    }

    // Способ 3: Поиск по мета-данным (расширение иногда добавляет скрытые элементы)
    if ($('meta[name="roblox-plus"], [data-roblox-plus]').length > 0) {
      rplusFoundBy.push('meta-data');
    }

    // Способ 4: Фоллбек по регулярному выражению в сыром HTML
    const rplusRegex = /aria-label=["']Roblox Plus subscriber["']|class=["'][^"']*icon-regular-roblox-plus[^"']*["']/i;
    if (!rplusFoundBy.length && rplusRegex.test(html)) {
      rplusFoundBy.push('regex-fallback');
    }

    // =========================================================================
    // ИТОГОВЫЙ РЕЗУЛЬТАТ
    // =========================================================================
    const hasPremium = premiumFoundBy.length > 0;
    const hasRobloxPlus = rplusFoundBy.length > 0;

    // Выводим в лог Vercel, какими способами нашли (для дебага)
    console.log(`[UserId ${userId}] Check result: Prem=${hasPremium} (by ${premiumFoundBy.join(',')}), R+=${hasRobloxPlus} (by ${rplusFoundBy.join(',')})`);

    return res.status(200).json({
      userId: userId,
      hasPremium: hasPremium,
      hasRobloxPlus: hasRobloxPlus,
      _debug: { // Дополнительные данные для проверки
        premiumMethods: premiumFoundBy,
        rplusMethods: rplusFoundBy
      }
    });

  } catch (error) {
    console.error('Критическая ошибка парсинга:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера при парсинге HTML.' });
  }
}
