export default async function handler(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Не указан userId' });
  }

  try {
    // 1. Проверяем подписку Roblox Plus через их официальный публичный API
    let hasRobloxPlus = false;
    try {
      const rplusRes = await fetch(`https://api.roblox.plus/v1/users/${userId}/premium`);
      if (rplusRes.ok) {
        const rplusData = await rplusRes.json();
        // API roblox.plus возвращает { data: true/false } или просто boolean
        hasRobloxPlus = rplusData === true || rplusData?.data === true || Boolean(rplusData?.isPremium);
      }
    } catch (e) {
      console.error('Ошибка проверки Roblox Plus:', e);
    }

    // 2. Проверяем публичные данные Roblox профиля (подписка Premium)
    let hasPremium = false;
    try {
      // Публичный эндпоинт профиля Roblox
      const profileRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        // Также проверяем подписку через экономический API / inventory
        hasPremium = Boolean(profileData.hasPremium);
      }
      
      // Если основной API скрывает Premium, делаем фоллбек-запрос к странице профиля
      if (!hasPremium) {
        const htmlRes = await fetch(`https://www.roblox.com/users/${userId}/profile`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          }
        });
        if (htmlRes.ok) {
          const html = await htmlRes.text();
          // Поиск иконки премиума или мета-тегов подписки
          if (html.includes('icon-premium') || html.includes('aria-label="Premium"') || html.includes('Roblox Premium')) {
            hasPremium = true;
          }
          if (html.includes('Roblox Plus subscriber') || html.includes('icon-regular-roblox-plus')) {
            hasRobloxPlus = true;
          }
        }
      }
    } catch (e) {
      console.error('Ошибка проверки Roblox Premium:', e);
    }

    return res.status(200).json({
      userId: userId,
      hasPremium: hasPremium,
      hasRobloxPlus: hasRobloxPlus
    });

  } catch (error) {
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
}
