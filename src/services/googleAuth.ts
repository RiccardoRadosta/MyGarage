import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

let isInitialized = false;

export const initGoogleSignIn = (): void => {
  if (isInitialized) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  GoogleSignin.configure({
    webClientId: webClientId || undefined,
    offlineAccess: false,
    scopes: ['email', 'profile'],
  });
  isInitialized = true;
};

export type GoogleSignInResult =
  | { success: true; idToken: string }
  | { success: false; cancelled: true };

export const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!webClientId) {
    throw new Error('Google Client ID non configurato. Imposta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
  }

  initGoogleSignIn();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // Assicura che non rimanga un account precedentemente selezionato in cache,
  // così da mostrare sempre il selettore account Google a ogni tentativo
  await signOutGoogle();

  try {
    const response = await GoogleSignin.signIn();

    if (response.type === 'cancelled') {
      return { success: false, cancelled: true };
    }

    if (response.type === 'success') {
      const idToken = response.data.idToken;
      if (!idToken) {
        await signOutGoogle();
        throw new Error('Token Google mancante nella risposta del dispositivo.');
      }
      return { success: true, idToken };
    }

    return { success: false, cancelled: true };
  } catch (error: any) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { success: false, cancelled: true };
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Accesso con Google già in corso. Attendi qualche istante.');
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services non disponibili o non aggiornati sul dispositivo.');
      }
    }
    await signOutGoogle();
    throw error;
  }
};

export const signOutGoogle = async (): Promise<void> => {
  try {
    initGoogleSignIn();
    await GoogleSignin.signOut();
  } catch {
    // Non bloccare se non c'era una sessione Google attiva
  }
};
