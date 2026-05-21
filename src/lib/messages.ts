import type { Payment, Deal } from '@/types';
import { formatAmount, formatDate } from './calculations';

export function generateReminderMessage(clientName: string, deal: Deal, payment: Payment, lang: 'ru' | 'uz' = 'ru'): string {
  const amountStr = formatAmount(payment.amount);
  const dateStr = formatDate(payment.extendedDate || payment.dueDate);
  const product = deal.product;

  if (lang === 'uz') {
    if (payment.status === 'overdue') {
      return `Hurmatli ${clientName}! ⚠️\n\nSizni "${product}" mahsuloti uchun ${amountStr} miqdoridagi to'lov muddati kechikkanligi haqida ogohlantiramiz.\n\nTo'lov ${dateStr} sanasigacha amalga oshirilishi kerak edi.\n\nPenya hisoblanmasligi va kredit tarixingiz yomonlashmasligi uchun to'lovni zudlik bilan amalga oshirishingizni so'raymiz.\n\nHurmat bilan, Variant.`;
    }

    if (payment.status === 'pending') {
      return `Assalomu alaykum, ${clientName}! 📱\n\nEslatib o'tamiz, grafik bo'yicha ${dateStr} kuni "${product}" mahsuloti uchun navbatdagi to'lovingiz bor.\n\nTo'lov summasi: ${amountStr}.\n\nIltimos, to'lovni o'z vaqtida amalga oshirishni unutmang. Bizni tanlaganingiz uchun rahmat!\n\nHurmat bilan, Variant.`;
    }

    if (payment.status === 'paid') {
      return `Assalomu alaykum, ${clientName}! ✅\n\n"${product}" mahsuloti uchun ${amountStr} miqdoridagi to'lovingiz muvaffaqiyatli qabul qilindi.\n\nTo'lovni o'z vaqtida amalga oshirganingiz uchun rahmat!`;
    }

    return `Assalomu alaykum, ${clientName}!\n\n"${product}" uchun to'lov ma'lumoti: summa ${amountStr}, sana ${dateStr}.`;
  } else {
    if (payment.status === 'overdue') {
      return `Уважаемый(ая) ${clientName}! ⚠️\n\nУведомляем вас о просрочке платежа на сумму ${amountStr} за товар "${product}".\n\nПлатеж должен был поступить ${dateStr}.\n\nПросим вас срочно произвести оплату во избежание начисления пени и ухудшения кредитной истории.\n\nС уважением, Variant.`;
    }

    if (payment.status === 'pending') {
      return `Здравствуйте, ${clientName}! 📱\n\nНапоминаем, что ${dateStr} у вас по графику плановый платеж за товар "${product}".\n\nСумма к оплате: ${amountStr}.\n\nПожалуйста, позаботьтесь об оплате заранее. Спасибо, что вы с нами!\n\nС уважением, Variant.`;
    }

    if (payment.status === 'paid') {
      return `Здравствуйте, ${clientName}! ✅\n\nВаш платеж на сумму ${amountStr} за товар "${product}" успешно получен.\n\nСпасибо за своевременную оплату!`;
    }

    return `Здравствуйте, ${clientName}!\n\nИнформация по вашему платежу за "${product}": сумма ${amountStr}, дата ${dateStr}.`;
  }
}

export function getWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function getTelegramLink(phone: string): string {
  const cleanPhone = phone.replace(/\+/g, '');
  return `https://t.me/+${cleanPhone}`;
}
