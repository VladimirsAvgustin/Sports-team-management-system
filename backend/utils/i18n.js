const SUPPORTED_LOCALES = new Set(['en', 'lv']);

const normalizeLocale = (value) => {
  const locale = String(value || '').trim().toLowerCase();

  if (!locale) {
    return 'lv';
  }

  const primaryLocale = locale.split(',')[0].split('-')[0];
  return SUPPORTED_LOCALES.has(primaryLocale) ? primaryLocale : 'lv';
};

const getLocaleFromRequest = (req) => {
  return normalizeLocale(
    req?.headers?.['accept-language'] ||
    req?.headers?.['x-locale'] ||
    req?.query?.locale
  );
};

const API_MESSAGE_TRANSLATIONS = {
  'Apmeklējuma ierakstiem jābūt masīvam': 'Attendance records must be an array',
  'Apmeklējuma ieraksts nav atrasts': 'Attendance record was not found',
  'Apmeklējumu var atzīmēt tikai treniņiem': 'Attendance can only be marked for practices',
  'Atbildes ziņojums nav atrasts': 'Reply message was not found',
  'Atbildes ziЕ†ojums nav atrasts': 'Reply message was not found',
  'Atiestatīšanas tokens nav derīgs vai ir beidzies': 'The reset token is invalid or has expired',
  'Atlasītā komanda nav atrasta': 'The selected team was not found',
  'Autentifikācijas kļūda': 'Authentication error',
  'Autorizācijas tokens nav norādīts': 'Authorization token was not provided',
  'CORS piekļuve nav atļauta': 'CORS access is not allowed',
  'Datubāzes kļūda': 'Database error',
  'E-pasts ir obligāts': 'Email is required',
  'E-pasts veiksmīgi nosūtīts': 'Email sent successfully',
  'Failam jābūt mazākam par 6 MB': 'File must be smaller than 6 MB',
  'Fails nav atrasts': 'File was not found',
  'Gaidošs trenera pieprasījums nav atrasts': 'Pending coach request was not found',
  'Galvenais treneris nevar vienlaikus pievienoties citai komandai kā asistents': 'The head coach cannot join another team as an assistant at the same time',
  'Galvenie treneri nevar pievienoties citai komandai kā trenera asistenti.': 'Head coaches cannot join another team as assistant coaches.',
  'Iekšēja servera kļūda': 'Internal server error',
  'Ievadiet e-pastu un paroli': 'Enter email and password',
  'Jūs neesat šīs komandas dalībnieks': 'You are not a member of this team',
  'Jūs veiksmīgi pievienojāties komandai': 'You joined the team successfully',
  'Jūsu trenera asistenta pieprasījums šai komandai jau gaida apstiprinājumu.': 'Your assistant coach request for this team is already pending approval.',
  'Komanda ar šo kodu nav atrasta': 'No team was found with this code',
  'Komanda izveidota, bet neizdevās to piesaistīt trenerim': 'Team was created, but could not be assigned to the coach',
  'Komanda nav atrasta': 'Team was not found',
  'Komanda veiksmīgi izveidota': 'Team created successfully',
  'Komandas ID jābūt pozitīvam skaitlim': 'Team ID must be a positive number',
  'Komandas kodam jābūt unikālam': 'Team code must be unique',
  'Komandas kods ir obligāts': 'Team code is required',
  'Komandas nosaukums ir obligāts': 'Team name is required',
  'Konts ar šo e-pastu nav atrasts.': 'No account was found with this email.',
  'Kā asistenti var tikt apstiprināti tikai treneru konti': 'Only coach accounts can be approved as assistants',
  'Kļūda, atjauninot apmeklējumu': 'Error updating attendance',
  'Kļūda, atjauninot komandu': 'Error updating team',
  'Kļūda, atjauninot lietotāju': 'Error updating user',
  'Kļūda, atjauninot notikumu': 'Error updating event',
  'Kļūda, atjauninot statistiku': 'Error updating statistics',
  'Kļūda, dzēšot apmeklējumu': 'Error deleting attendance',
  'Kļūda, dzēšot lietotāju': 'Error deleting user',
  'Kļūda, dzēšot notikumu': 'Error deleting event',
  'Kļūda, ielādējot aktivitātes': 'Error loading activities',
  'Kļūda, ielādējot apmeklējuma statistiku': 'Error loading attendance statistics',
  'Kļūda, ielādējot apmeklējumu': 'Error loading attendance',
  'Kļūda, ielādējot grafiku': 'Error loading schedule',
  'Kļūda, ielādējot komandas': 'Error loading teams',
  'Kļūda, ielādējot komandu': 'Error loading team',
  'Kļūda, ielādējot lietotāja datus': 'Error loading user data',
  'Kļūda, ielādējot lietotājus': 'Error loading users',
  'Kļūda, ielādējot notikumus': 'Error loading events',
  'Kļūda, ielādējot spēlētāja statistiku': 'Error loading player statistics',
  'Kļūda, ielādējot spēlētājus': 'Error loading players',
  'Kļūda, ielādējot statistiku': 'Error loading statistics',
  'Kļūda, izveidojot komandu': 'Error creating team',
  'Kļūda, meklējot komandu': 'Error searching for team',
  'Kļūda, piesaistot lietotāju komandai': 'Error assigning user to team',
  'Kļūda, pievienojot notikumu': 'Error adding event',
  'Kļūda, pārbaudot laika konfliktus': 'Error checking time conflicts',
  'Kļūda, pārbaudot spēlētāju': 'Error checking player',
  'Kļūda, pārbaudot treneri': 'Error checking coach',
  'Kļūda, reģistrējot treneri': 'Error registering coach',
  'Kļūda, saglabājot apmeklējumu': 'Error saving attendance',
  'Lai izveidotu komandu, jānorāda komandas nosaukums un kods.': 'Team name and code are required to create a team.',
  'Lietotāja ID nav norādīts': 'User ID was not provided',
  'Lietotāja ID un statuss ir obligāti': 'User ID and status are required',
  'Lietotājam nav komandas': 'The user is not on a team',
  'Lietotājs ar šo e-pastu jau pastāv': 'A user with this email already exists',
  'Lietotājs jau ir komandā': 'The user is already on a team',
  'Lietotājs nav atrasts': 'User was not found',
  'Lietotājs veiksmīgi reģistrēts': 'User registered successfully',
  'Logotips veiksmīgi augšupielādēts': 'Logo uploaded successfully',
  'Logotips veiksmīgi dzēsts': 'Logo deleted successfully',
  'Logotipu var augšupielādēt tikai komandas treneris': 'Only the team coach can upload the logo',
  'Logotipu var augšupielādēt tikai šīs komandas treneri': 'Only this team\'s coaches can upload the logo',
  'Logotipu var dzēst tikai komandas treneris': 'Only the team coach can delete the logo',
  'Logotipu var dzēst tikai šīs komandas treneri': 'Only this team\'s coaches can delete the logo',
  'Lūdzu, aizpildiet visus komandas laukus': 'Please fill in all team fields',
  'Lūdzu, aizpildiet visus laukus.': 'Please fill in all fields.',
  'Maršruts nav atrasts': 'Route was not found',
  'Nav atļauts atjaunināt šo spēlētāju': 'You are not allowed to update this player',
  'Neatbalstīts faila tips': 'Unsupported file type',
  'Nederīga čata istaba': 'Invalid chat room',
  'Nederīgi faila dati': 'Invalid file data',
  'Nederīgs apmeklējuma statuss': 'Invalid attendance status',
  'Nederīgs autorizācijas tokens': 'Invalid authorization token',
  'Nederīgs komandas ID': 'Invalid team ID',
  'Nederīgs faila ceļš': 'Invalid file path',
  'Nederīgs faila nosaukums': 'Invalid file name',
  'Nederīgs profila attēls': 'Invalid profile image',
  'Nederīgs ziņojums': 'Invalid message',
  'NederД«ga ДЌata istaba': 'Invalid chat room',
  'NederД«gs faila ceДјЕЎ': 'Invalid file path',
  'NederД«gs faila nosaukums': 'Invalid file name',
  'NederД«gs ziЕ†ojums': 'Invalid message',
  'Neizdevās apstiprināt trenera pieprasījumu': 'Failed to approve coach request',
  'Neizdevās augšupielādēt failu': 'Failed to upload file',
  'Neizdevās dzēst logotipu': 'Failed to delete logo',
  'Neizdevās dzēst profila attēlu': 'Failed to delete profile image',
  'Neizdevās dzēst ziņojumu': 'Failed to delete message',
  'Neizdevās ielādēt komandas spēlētājus': 'Failed to load team players',
  'Neizdevās ielādēt failu': 'Failed to load file',
  'Neizdevās ielādēt treneru pievienošanās pieprasījumus': 'Failed to load coach join requests',
  'Neizdevās izveidot čata istabu': 'Failed to create chat room',
  'Neizdevās noraidīt trenera pieprasījumu': 'Failed to reject coach request',
  'Neizdevās nosūtīt e-pastu. Lūdzu, mēģiniet vēlāk.': 'Failed to send email. Please try again later.',
  'Neizdevās nosūtīt ziņojumu': 'Failed to send message',
  'Neizdevās pamest komandu': 'Failed to leave the team',
  'Neizdevās pievienoties čatam': 'Failed to join chat',
  'Neizdevās saglabāt logotipu': 'Failed to save logo',
  'Neizdevās saglabāt profila attēlu': 'Failed to save profile image',
  'NeizdevДЃs dzД“st ziЕ†ojumu': 'Failed to delete message',
  'NeizdevДЃs ielДЃdД“t failu': 'Failed to load file',
  'NeizdevДЃs nosЕ«tД«t ziЕ†ojumu': 'Failed to send message',
  'Nepareiza parole': 'Incorrect password',
  'Nepieciešams atiestatīšanas tokens un jaunā parole': 'Reset token and new password are required',
  'Notikuma nosaukums un datums ir obligāti': 'Event name and date are required',
  'Notikums nav atrasts': 'Event was not found',
  'Parole veiksmīgi atiestatīta': 'Password reset successfully',
  'Paroles apstrādes kļūda': 'Password processing error',
  'Paroles atiestatīšanas e-pasts ir nosūtīts. Tas var pienākt līdz 5 minūšu laikā.': 'Password reset email has been sent. It may take up to 5 minutes to arrive.',
  'Paroles pārbaudes kļūda': 'Password verification error',
  'Piekļuve liegta': 'Access denied',
  'PiekДјuve liegta': 'Access denied',
  'Pieslēgšanās veiksmīga': 'Login successful',
  'Profila attēls veiksmīgi augšupielādēts': 'Profile image uploaded successfully',
  'Profila attēls veiksmīgi dzēsts': 'Profile image deleted successfully',
  'Reģistrācijas kļūda': 'Registration error',
  'Servera kļūda': 'Server error',
  'Spēlētāja profila attēls veiksmīgi augšupielādēts': 'Player profile image uploaded successfully',
  'Spēlētāja profila attēls veiksmīgi dzēsts': 'Player profile image deleted successfully',
  'Spēlētājs jūsu komandā nav atrasts': 'Player was not found on your team',
  'Spēlētājs nav šīs komandas dalībnieks': 'Player is not a member of this team',
  'Spēlētājs noņemts no komandas': 'Player removed from team',
  'Spēlētāju profila attēlus var atjaunināt tikai šīs komandas treneris': 'Only this team\'s coach can update player profile images',
  'Spēlētāju statistiku var atjaunināt tikai komandas treneri': 'Only team coaches can update player statistics',
  'Spēlētājus var noņemt tikai galvenais treneris': 'Only the head coach can remove players',
  'Spēlētājus var noņemt tikai komandas treneris': 'Only the team coach can remove players',
  'Statistika veiksmīgi atjaunināta': 'Statistics updated successfully',
  'Trenera asistenta pieprasījums noraidīts': 'Assistant coach request rejected',
  'Trenera asistenta pieprasījums nosūtīts galvenajam trenerim.': 'Assistant coach request sent to the head coach.',
  'Trenera asistents veiksmīgi apstiprināts': 'Assistant coach approved successfully',
  'Trenera asistentu pieprasījumus var apstiprināt tikai galvenais treneris': 'Only the head coach can approve assistant coach requests',
  'Trenera asistentu pieprasījumus var noraidīt tikai galvenais treneris': 'Only the head coach can reject assistant coach requests',
  'Trenera asistentu pieprasījumus var pārskatīt tikai galvenais treneris': 'Only the head coach can review assistant coach requests',
  'Treneriem vispirms jāreģistrējas un pēc tam lietotnē jānosūta pievienošanās pieprasījums.': 'Coaches must register first and then send a join request in the app.',
  'Treneris un komanda veiksmīgi reģistrēti': 'Coach and team registered successfully',
  'Visi lauki ir obligāti': 'All fields are required',
  'Ziņojumi atzīmēti kā izlasīti': 'Messages marked as read',
  'Ziņojums ir tukšs': 'Message is empty',
  'Ziņojums nav atrasts': 'Message was not found',
  'Ziņojums veiksmīgi dzēsts': 'Message deleted successfully',
  'ZiЕ†ojums nav atrasts': 'Message was not found',
  'Šajā datumā un laikā jau ir notikums': 'There is already an event at this date and time',
  'Šis treneris jau ir komandā': 'This coach is already on the team',
  'Šo ziņojumu nevar dzēst': 'This message cannot be deleted',
  'Е o ziЕ†ojumu nevar dzД“st': 'This message cannot be deleted'
};

const DYNAMIC_TRANSLATIONS = [
  {
    pattern: /^Parolei jābūt vismaz (\d+) rakstzīmes garai$/,
    translate: ([, count]) => `Password must be at least ${count} characters long.`
  },
  {
    pattern: /^Jums jau ir trenera asistenta pieprasījums komandai (.+)\.$/,
    translate: ([, teamName]) => `You already have an assistant coach request for team ${teamName}.`
  },
  {
    pattern: /^Jūs pametāt komandu (.*)\. Komandas īpašumtiesības nodotas lietotājam (.*)\.$/,
    translate: ([, teamName, successorName]) => `You left team ${teamName}. Team ownership was transferred to ${successorName}.`
  },
  {
    pattern: /^Jūs veiksmīgi pametāt komandu (.*)\.$/,
    translate: ([, teamName]) => `You successfully left team ${teamName}.`
  },
  {
    pattern: /^(.+) pievienojās čatam$/,
    translate: ([, userName]) => `${userName} joined the chat`
  },
  {
    pattern: /^(.+) pameta čatu$/,
    translate: ([, userName]) => `${userName} left the chat`
  }
];

const translateApiMessage = (value, locale) => {
  if (normalizeLocale(locale) !== 'en' || typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  const exactTranslation = API_MESSAGE_TRANSLATIONS[trimmedValue];

  if (exactTranslation) {
    return exactTranslation;
  }

  for (const rule of DYNAMIC_TRANSLATIONS) {
    const match = trimmedValue.match(rule.pattern);

    if (match) {
      return rule.translate(match);
    }
  }

  return value;
};

const translateErrorList = (errors, locale) => {
  if (!Array.isArray(errors)) {
    return errors;
  }

  return errors.map((item) => {
    if (!item || typeof item !== 'object' || typeof item.error !== 'string') {
      return item;
    }

    return {
      ...item,
      error: translateApiMessage(item.error, locale)
    };
  });
};

const localizeResponseBody = (body, locale) => {
  const normalizedLocale = normalizeLocale(locale);

  if (normalizedLocale !== 'en' || !body || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }

  const localizedBody = { ...body };

  if (typeof localizedBody.error === 'string') {
    localizedBody.error = translateApiMessage(localizedBody.error, normalizedLocale);
  }

  if (typeof localizedBody.message === 'string') {
    localizedBody.message = translateApiMessage(localizedBody.message, normalizedLocale);
  }

  if (Array.isArray(localizedBody.errors)) {
    localizedBody.errors = translateErrorList(localizedBody.errors, normalizedLocale);
  }

  return localizedBody;
};

module.exports = {
  getLocaleFromRequest,
  localizeResponseBody,
  normalizeLocale,
  translateApiMessage
};
