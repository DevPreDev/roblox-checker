export default async function handler(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Не указан userId' });
  }

  try {
    // 1. ПРОВЕРКА ROBLOX PLUS (запрос к API расширения Roblox+)
    let hasRobloxPlus = false;
    try {
      const rplusRes = await fetch(`https://api.roblox.plus/v1/users/${userId}/premium`);
      if (rplusRes.ok) {
        const rplusData = await rplusRes.json();
        // API отдает true, если юзер подписчик Roblox+
        hasRobloxPlus = rplusData === true || rplusData?.data === true || Boolean(rplusData?.isPremium);
      }
    } catch (e) {
      console.error('R+ API Error:', e);
    }

    // 2. ПРОВЕРКА ROBLOX PREMIUM
    let hasPremium = false;
    try {
      const premRes = await fetch(`https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`);
      if (premRes.ok) {
        const premData = await premRes.json();
        hasPremium = Boolean(premData);
      }
    } catch (e) {
      console.error('Premium API Error:', e);
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
