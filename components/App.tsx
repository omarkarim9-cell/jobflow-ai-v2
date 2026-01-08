if (!profile && user) {
  profile = {
    id: user.id,
    fullName: user.fullName || '',
    email: user.primaryEmailAddress?.emailAddress || '',
    phone: '',
    resumeContent: '',
    onboardedAt: new Date().toISOString(),
    preferences: {
      targetRoles: [],
      targetLocations: [],
      minSalary: '',
      remoteOnly: false,
      language: 'en'
    },
    connectedAccounts: [],
    plan: 'pro'
  };

  try {
    const saved = await saveUserProfile(profile, token);
    profile = saved ?? profile;
  } catch (e) {
    console.warn('[syncData] initial profile save failed', e);
  }
}
