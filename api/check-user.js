export default async function handler(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Не указан userId' });
  }

  try {
    const response = await fetch(`https://www.roblox.com/users/${userId}/profile`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const html = await response.text();

    const hasRobloxPlus = html.includes('aria-label="Roblox Plus subscriber"') || 
                         html.includes('icon-regular-roblox-plus');

    const hasPremium = html.includes('icon-premium') || 
                       html.includes('aria-label="Premium"');

    return res.status(200).json({
      userId: userId,
      hasPremium: hasPremium,
      hasRobloxPlus: hasRobloxPlus
    });

  } catch (error) {
    return res.status(500).json({ error: 'Ошибка при парсинге страницы' });
  }
}
