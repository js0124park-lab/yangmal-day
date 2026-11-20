// Korean messages for Supabase Auth errors (by error.code, falling back to the message text).

const BY_CODE: Record<string, string> = {
  invalid_credentials: '이메일 또는 비밀번호가 맞지 않아요.',
  email_not_confirmed: '메일함에서 인증 링크를 먼저 눌러 주세요.',
  user_already_exists: '이미 가입된 이메일이에요. 로그인해 주세요.',
  email_exists: '이미 가입된 이메일이에요. 로그인해 주세요.',
  weak_password: '비밀번호가 너무 쉬워요. 8자 이상, 영문과 숫자를 섞어 주세요.',
  same_password: '지금 비밀번호와 다른 비밀번호를 입력해 주세요.',
  email_address_invalid: '이메일 주소 형식을 확인해 주세요.',
  validation_failed: '입력한 내용을 다시 확인해 주세요.',
  over_email_send_rate_limit: '메일을 너무 자주 보냈어요. 잠시 후 다시 시도해 주세요.',
  over_request_rate_limit: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
  anonymous_provider_disabled: '게스트 로그인이 꺼져 있어요. 이 기기에만 저장돼요.',
  signup_disabled: '지금은 회원가입을 받지 않아요.',
  otp_expired: '링크가 만료됐어요. 다시 요청해 주세요.',
  user_not_found: '가입되지 않은 이메일이에요.',
  session_not_found: '로그인이 만료됐어요. 다시 로그인해 주세요.',
};

export function authErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return '알 수 없는 문제가 생겼어요. 다시 시도해 주세요.';
  const e = err as { code?: string; message?: string; status?: number };
  if (e.code && BY_CODE[e.code]) return BY_CODE[e.code];
  const msg = e.message ?? '';
  if (/fetch|network/i.test(msg)) return '인터넷 연결을 확인해 주세요.';
  if (/invalid login/i.test(msg)) return BY_CODE.invalid_credentials;
  if (/already registered/i.test(msg)) return BY_CODE.user_already_exists;
  if (/password should be/i.test(msg)) return BY_CODE.weak_password;
  return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
}
