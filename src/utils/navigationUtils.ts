/**
 * Utility per la navigazione condivisa tra stack e tab.
 */

/**
 * Conduce l'utente in modo sicuro alla sezione Premium del Profilo,
 * indipendentemente dal livello di annidamento nello stack di navigazione.
 */
export const navigateToPremium = (navigation: any) => {
  if (!navigation) return;
  try {
    // Navigazione verso il tab ProfileTab annidato dentro MainTabs
    navigation.navigate('MainTabs', { screen: 'ProfileTab' });
  } catch {
    try {
      navigation.navigate('ProfileTab');
    } catch (err) {
      console.warn('[Navigation] Impossibile navigare a ProfileTab:', err);
    }
  }
};
