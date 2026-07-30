export default async function handler(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Не указан userId' });
  }

  try {
    // Делаем запрос к профилю с полными заголовками браузера
    const response = await fetch(`https://www.roblox.com/users/${userId}/profile`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const html = await response.text();

    // Гибкая проверка с помощью регулярных выражений (игнорирует разницу в кавычках/пробелах)
    const hasRobloxPlus = /aria-label=["']Roblox Plus subscriber["']/i.test(html) || 
                         /icon-regular-roblox-plus/i.test(html);

    const hasPremium = /aria-label=["']Premium["']/i.test(html) || 
                       /icon-premium/i.test(html);

    return res.status(200).json({
      userId: userId,
      hasPremium: hasPremium,
      hasRobloxPlus: hasRobloxPlus
    });

  } catch (error) {
    return res.status(500).json({ error: 'Ошибка при парсинге страницы' });
  }
}
