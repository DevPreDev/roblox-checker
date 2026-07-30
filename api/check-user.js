export default async function handler(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Не указан userId' });
  }

  try {
    // 1. ПРОВЕРКА ROBLOX PLUS (через официальный API расширения Roblox+)
    let hasRobloxPlus = false;
    try {
      const rplusRes = await fetch(`https://api.roblox.plus/v1/users/${userId}/premium`);
      if (rplusRes.ok) {
        const rplusData = await rplusRes.json();
        // API возвращает true, если у пользователя есть подписка Roblox+
        hasRobloxPlus = rplusData === true || rplusData?.data === true || Boolean(rplusData?.isPremium);
      }
    } catch (e) {
      console.error('Ошибка R+ API:', e);
    }

    // 2. ПРОВЕРКА ROBLOX PREMIUM (через официальный API инвентаря/членства)
    let hasPremium = false;
    try {
      // Проверяем статус Premium через эндпоинт инвентаря/официальных публичных данных
      const premRes = await fetch(`https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`);
      if (premRes.ok) {
        const premData = await premRes.json();
        hasPremium = Boolean(premData);
      }
      
      // Дополнительный фоллбек-запрос через профиль API
      if (!hasPremium) {
        const userRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.hasPremium !== undefined) {
            hasPremium = Boolean(userData.hasPremium);
          }
        }
      }
    } catch (e) {
      console.error('Ошибка Premium API:', e);
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
