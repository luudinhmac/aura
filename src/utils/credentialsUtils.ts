/**
 * Chuyển đổi chuỗi tiếng Việt có dấu thành không dấu
 */
export function removeVietnameseTones(str: string): string {
  let result = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  result = result.replace(/[đĐ]/g, 'd');
  return result;
}

/**
 * Tự động tạo gợi ý tên đăng nhập và email công ty từ Tên Thật tiếng Việt
 * Ví dụ: "Trương Tiểu My" -> username: "mytt", email: "mytt@auratalent.vn"
 * "Trần Minh Anh" -> username: "anhtm", email: "anhtm@auratalent.vn"
 */
export function generateCompanyCredentials(
  fullName: string,
  domain: string = 'auratalent.vn'
): { username: string; email: string } {
  if (!fullName || !fullName.trim()) {
    return { username: '', email: '' };
  }

  const clean = removeVietnameseTones(fullName.trim().toLowerCase())
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');

  const words = clean.split(' ').filter(Boolean);
  if (words.length === 0) {
    return { username: '', email: '' };
  }

  if (words.length === 1) {
    const single = words[0];
    return {
      username: single,
      email: `${single}@${domain}`
    };
  }

  // Từ cuối cùng là Tên chính (First name theo văn hóa VN)
  const firstName = words[words.length - 1];
  // Các từ đứng trước là Họ và Tên đệm
  const initials = words
    .slice(0, words.length - 1)
    .map((w) => w[0])
    .join('');

  const username = `${firstName}${initials}`;
  const email = `${username}@${domain}`;

  return { username, email };
}
