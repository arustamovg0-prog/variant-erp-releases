import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Language = 'ru' | 'uz';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const translations = {
  ru: {
    // Navigation / Layout
    'nav.dashboard': 'Обзор',
    'nav.clients': 'База клиентов',
    'nav.deals': 'Сделки',
    'nav.payments': 'Платежи',
    'nav.monitoring': 'Мониторинг',
    'nav.cashbox': 'Касса',
    'nav.reports': 'Отчёты',
    'nav.admin': 'Админ-панель',
    'nav.settings': 'Настройки',
    'nav.logout': 'Выйти',
    'role.admin': 'Администратор',
    'role.agent': 'Агент',

    // Loading / Common
    'common.loading': 'Загрузка...',
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.edit': 'Редактировать',
    'common.delete': 'Удалить',
    'common.add': 'Добавить',
    'common.search': 'Поиск...',
    'common.status': 'Статус',
    'common.actions': 'Действия',
    'common.success': 'Успешно',
    'common.error': 'Ошибка',
    'common.confirm_delete': 'Вы уверены, что хотите удалить?',
    'common.not_specified': 'Не указано',
    'common.days': 'дн.',
    'common.yes': 'Да',
    'common.no': 'Нет',

    // Login Page
    'login.title': 'Вход в систему',
    'login.subtitle': 'Введите учётные данные агента',
    'login.signup_title': 'Регистрация',
    'login.signup_subtitle': 'Создайте аккаунт агента',
    'login.name': 'Имя агента',
    'login.name_placeholder': 'Ахметов Руслан',
    'login.phone': 'Телефон',
    'login.email': 'Email',
    'login.password': 'Пароль',
    'login.password_min': '(мин. 6 символов)',
    'login.login_btn': 'Войти',
    'login.signup_btn': 'Зарегистрироваться',
    'login.no_account': 'Нет аккаунта? Зарегистрироваться',
    'login.has_account': 'Уже есть аккаунт? Войти',
    'login.error_fill': 'Заполните все поля',
    'login.error_name': 'Введите имя',
    'login.success_signup': 'Аккаунт создан! Теперь вы можете войти.',

    // Dashboard Page
    'db.title': 'Обзор',
    'db.subtitle': 'Панель агента',
    'db.total_deals': 'Всего сделок',
    'db.active_portfolios': 'активных портфелей',
    'db.portfolio_amount': 'Сумма портфеля',
    'db.paid': 'Оплачено',
    'db.remaining': 'остаток',
    'db.collection': 'Собираемость',
    'db.overdues_count': 'просрочек',
    'db.overdues': 'Просрочки',
    'db.upcoming_7': 'Ближайшие (7 дн)',
    'db.require_payment': 'требуют оплаты',
    'db.overdue_payments': 'Просроченные платежи',
    'db.top_overdue': 'Топ',
    'db.no_overdue': 'Нет просроченных платежей',
    'db.critical_deals': 'Критические сделки',
    'db.no_critical': 'Нет критических сделок',
    'db.upcoming_payments_7': 'Ближайшие платежи (7 дней)',

    // Clients Page
    'clients.title': 'База клиентов',
    'clients.subtitle': 'Управление клиентами и история их активности',
    'clients.search_placeholder': 'Поиск по имени или телефону...',
    'clients.add_client': 'Новый клиент',
    'clients.col_name': 'Клиент',
    'clients.col_phone': 'Телефон',
    'clients.col_active': 'Активные сделки',
    'clients.col_total': 'Всего рассрочки',
    'clients.col_overdue': 'Просрочено',
    'clients.no_clients': 'Клиенты не найдены',
    'clients.details': 'Детали клиента',
    'clients.edit_title': 'Редактировать клиента',
    'clients.field_name': 'ФИО Клиента',
    'clients.field_phone': 'Номер телефона',

    // Deals Page
    'deals.title': 'Сделки',
    'deals.subtitle': 'Активные контракты рассрочки',
    'deals.add_deal': 'Оформить сделку',
    'deals.status_all': 'Все сделк',
    'deals.status_active': 'Активные',
    'deals.status_completed': 'Завершенные',
    'deals.status_default': 'Проблемные',
    'deals.search_placeholder': 'Поиск сделки...',
    'deals.col_client': 'Клиент',
    'deals.col_product': 'Товар',
    'deals.col_amount': 'Сумма',
    'deals.col_term': 'Срок',
    'deals.col_status': 'Статус',
    'deals.col_comment': 'Комментарий',
    'deals.no_deals': 'Сделки не найдены',
    'deals.modal_title': 'Новая сделка рассрочки',
    'deals.step_info': 'Информация о клиенте',
    'deals.step_conditions': 'Условия рассрочки',
    'deals.step_referral': 'Доверенное лицо / Поручитель',
    'deals.field_product': 'Наименование товара',
    'deals.field_total': 'Общая сумма ($)',
    'deals.field_months': 'Срок рассрочки (месяцев)',
    'deals.field_monthly': 'Ежемесячный платеж',
    'deals.field_start': 'Дата начала',
    'deals.field_ref_name': 'ФИО доверенного лица',
    'deals.field_ref_phone': 'Телефон доверенного лица',
    'deals.field_ref_relation': 'Кем приходится клиенту',
    'deals.field_comment': 'Комментарий к сделке',
    'deals.create_btn': 'Создать сделку',
    'deals.details_title': 'Сделка',
    'deals.kpi_paid': 'Выплачено',
    'deals.kpi_remaining': 'Остаток долга',
    'deals.payment_schedule': 'График платежей',
    'deals.referral_info': 'Контактное лицо',
    'deals.delete_confirm': 'Вы уверены, что хотите удалить эту сделку? Это также удалит все её платежи.',

    // Payments Page
    'payments.title': 'Платежи',
    'payments.subtitle': 'Календарь и график поступлений рассрочки',
    'payments.filter_all': 'Все платежи',
    'payments.filter_pending': 'Ожидаемые',
    'payments.filter_paid': 'Оплаченные',
    'payments.filter_overdue': 'Просроченные',
    'payments.filter_extended': 'Отсроченные',
    'payments.search_placeholder': 'Поиск по клиенту или товару...',
    'payments.col_month': 'Месяц',
    'payments.col_due_date': 'Дата платежа',
    'payments.col_amount': 'Сумма',
    'payments.col_status': 'Статус',
    'payments.status_paid': 'Оплачен',
    'payments.status_pending': 'Ожидается',
    'payments.status_overdue': 'Просрочен',
    'payments.status_extended': 'Отсрочен',
    'payments.remind_wa': 'Напомнить в WhatsApp',
    'payments.remind_tg': 'Напомнить в Telegram',
    'payments.mark_paid': 'Отметить как оплачен',
    'payments.extend_btn': 'Дать отсрочку',
    'payments.extend_modal_title': 'Предоставление отсрочки',
    'payments.extend_new_date': 'Новая дата платежа',
    'payments.extend_confirm': 'Подтвердить отсрочку',

    // Monitoring Page
    'monitoring.title': 'Мониторинг оплат',
    'monitoring.subtitle': 'Контроль платежной дисциплины и просрочек',
    'monitoring.total_debt': 'Общий долг просрочек',
    'monitoring.overdue_rate': 'Уровень просрочки',
    'monitoring.clients_count': 'Клиентов с просрочкой',
    'monitoring.avg_delay': 'Ср. задержка',
    'monitoring.days_label': 'дней',
    'monitoring.debt_distribution': 'Распределение задолженности',
    'monitoring.debt_level_critical': 'Критическая (45+ дн)',
    'monitoring.debt_level_medium': 'Средняя (15-45 дн)',
    'monitoring.debt_level_low': 'Низкая (1-15 дн)',

    // Reports Page
    'reports.title': 'Отчёты и Экспорт',
    'reports.subtitle': 'Выгрузка финансовых данных и аналитики',
    'reports.export_db': 'Выгрузить базу данных (SQLite)',
    'reports.export_db_desc': 'Сохраняет резервную копию всей локальной базы данных на компьютер.',
    'reports.import_db': 'Загрузить базу агента',
    'reports.import_db_desc': 'Импортирует и объединяет данные из другого SQLite файла.',
    'reports.export_csv': 'Экспорт отчета по сделкам',
    'reports.export_csv_desc': 'Выгрузка текущего списка сделок в CSV для Excel.',
    'reports.sync_success': 'Синхронизация базы данных успешно завершена!',
    'reports.sync_error': 'Ошибка синхронизации:',
    'reports.export_success': 'База данных успешно выгружена:',
    'reports.csv_success': 'Отчет успешно сохранен:',
    'reports.db_cancelled': 'Операция отменена пользователем',

    // Settings Page
    'settings.title': 'Настройки системы',
    'settings.subtitle': 'Параметры платформы и локализации',
    'settings.company_name': 'Название компании',
    'settings.penalty_rate': 'Ставка пени (% в день просрочки)',
    'settings.grace_period': 'Льготный период (дней)',
    'settings.language': 'Язык интерфейса',
    'settings.save_settings': 'Сохранить настройки',
    'settings.success_save': 'Настройки успешно сохранены!',

    // Admin Dashboard Page
    'admin.title': 'Админ-панель',
    'admin.subtitle': 'Управление агентами и глобальная статистика',
    'admin.total_agents': 'Всего агентов',
    'admin.global_portfolio': 'Глобальный портфель',
    'admin.global_paid': 'Всего собрано',
    'admin.global_overdue': 'Общая просрочка',
    'admin.agent_list': 'Список агентов',
    'admin.add_agent': 'Добавить агента',
    'admin.col_agent': 'Агент',
    'admin.col_role': 'Роль',
    'admin.col_deals': 'Сделок',
    'admin.col_portfolio': 'Портфель',
    'admin.col_overdue': 'Просрочки',
    'admin.modal_title': 'Добавить нового агента',
    'admin.field_email': 'Электронная почта',
    'admin.field_password': 'Пароль учетной записи',
    'admin.field_role': 'Роль в системе',
    'admin.role_agent': 'Агент (Ограниченный доступ)',
    'admin.role_admin': 'Администратор (Полный доступ)',
  },
  uz: {
    // Navigation / Layout
    'nav.dashboard': 'Obzor',
    'nav.clients': 'Mijozlar bazasi',
    'nav.deals': 'Kelishuvlar',
    'nav.payments': 'To\'lovlar',
    'nav.monitoring': 'Monitoring',
    'nav.cashbox': 'Kassa',
    'nav.reports': 'Hisobotlar',
    'nav.admin': 'Admin paneli',
    'nav.settings': 'Sozlamalar',
    'nav.logout': 'Chiqish',
    'role.admin': 'Administrator',
    'role.agent': 'Agent',

    // Loading / Common
    'common.loading': 'Yuklanmoqda...',
    'common.save': 'Saqlash',
    'common.cancel': 'Bekor qilish',
    'common.edit': 'Tahrirlash',
    'common.delete': 'O\'chirish',
    'common.add': 'Qo\'shish',
    'common.search': 'Qidiruv...',
    'common.status': 'Status',
    'common.actions': 'Amallar',
    'common.success': 'Muvaffaqiyatli',
    'common.error': 'Xato',
    'common.confirm_delete': 'O\'chirishni xohlaysizmi?',
    'common.not_specified': 'Ko\'rsatilmagan',
    'common.days': 'kun',
    'common.yes': 'Ha',
    'common.no': 'Yo\'q',

    // Login Page
    'login.title': 'Tizimga kirish',
    'login.subtitle': 'Agent ma\'lumotlarini kiriting',
    'login.signup_title': 'Ro\'yxatdan o\'tish',
    'login.signup_subtitle': 'Agent hisobini yarating',
    'login.name': 'Agent ismi',
    'login.name_placeholder': 'Axmetov Ruslan',
    'login.phone': 'Telefon',
    'login.email': 'Email',
    'login.password': 'Parol',
    'login.password_min': '(kamida 6 ta belgi)',
    'login.login_btn': 'Kirish',
    'login.signup_btn': 'Ro\'yxatdan o\'tish',
    'login.no_account': 'Hisobingiz yo\'qmi? Ro\'yxatdan o\'tish',
    'login.has_account': 'Hisobingiz bormi? Tizimga kirish',
    'login.error_fill': 'Barcha maydonlarni to\'ldiring',
    'login.error_name': 'Ismingizni kiriting',
    'login.success_signup': 'Hisob yaratildi! Endi tizimga kirishingiz mumkin.',

    // Dashboard Page
    'db.title': 'Obzor',
    'db.subtitle': 'Agent paneli',
    'db.total_deals': 'Jami shartnomalar',
    'db.active_portfolios': 'faol portfellar',
    'db.portfolio_amount': 'Portfel summasi',
    'db.paid': 'To\'langan',
    'db.remaining': 'qoldiq',
    'db.collection': 'Yig\'iluvchanlik',
    'db.overdues_count': 'muddati o\'tganlar',
    'db.overdues': 'Muddati o\'tgan to\'lovlar',
    'db.upcoming_7': 'Yaqindagi (7 kun)',
    'db.require_payment': 'to\'lov kutilmoqda',
    'db.overdue_payments': 'Muddati o\'tgan to\'lovlar',
    'db.top_overdue': 'Top',
    'db.no_overdue': 'Muddati o\'tgan to\'lovlar yo\'q',
    'db.critical_deals': 'Kritik shartnomalar',
    'db.no_critical': 'Kritik shartnomalar yo\'q',
    'db.upcoming_payments_7': 'Yaqindagi to\'lovlar (7 kun)',

    // Clients Page
    'clients.title': 'Mijozlar bazasi',
    'clients.subtitle': 'Mijozlarni boshqarish va ularning faoliyati tarixi',
    'clients.search_placeholder': 'Ism yoki telefon bo\'yicha qidiruv...',
    'clients.add_client': 'Yangi mijoz',
    'clients.col_name': 'Mijoz',
    'clients.col_phone': 'Telefon',
    'clients.col_active': 'Faol shartnomalar',
    'clients.col_total': 'Jami muddatli to\'lov',
    'clients.col_overdue': 'Muddati o\'tgan',
    'clients.no_clients': 'Mijozlar topilmadi',
    'clients.details': 'Mijoz tafsilotlari',
    'clients.edit_title': 'Mijozni tahrirlash',
    'clients.field_name': 'Mijoz F.I.Sh.',
    'clients.field_phone': 'Telefon raqami',

    // Deals Page
    'deals.title': 'Kelishuvlar',
    'deals.subtitle': 'Faol muddatli to\'lov shartnomalari',
    'deals.add_deal': 'Shartnoma tuzish',
    'deals.status_all': 'Barcha kelishuvlar',
    'deals.status_active': 'Faol',
    'deals.status_completed': 'Yakunlangan',
    'deals.status_default': 'Muammoli',
    'deals.search_placeholder': 'Shartnomani qidirish...',
    'deals.col_client': 'Mijoz',
    'deals.col_product': 'Mahsulot',
    'deals.col_amount': 'Summa',
    'deals.col_term': 'Muddat',
    'deals.col_status': 'Status',
    'deals.col_comment': 'Izoh',
    'deals.no_deals': 'Kelishuvlar topilmadi',
    'deals.modal_title': 'Yangi muddatli to\'lov shartnomasi',
    'deals.step_info': 'Mijoz ma\'lumotlari',
    'deals.step_conditions': 'Shartnoma shartlari',
    'deals.step_referral': 'Kafolat beruvchi shaxs',
    'deals.field_product': 'Mahsulot nomi',
    'deals.field_total': 'Umumiy summa ($)',
    'deals.field_months': 'To\'lov muddati (oy)',
    'deals.field_monthly': 'Oylik to\'lov',
    'deals.field_start': 'Boshlanish sanasi',
    'deals.field_ref_name': 'Kafolat beruvchi F.I.Sh.',
    'deals.field_ref_phone': 'Kafolat beruvchi telefoni',
    'deals.field_ref_relation': 'Mijozga kim bo\'ladi',
    'deals.field_comment': 'Shartnoma uchun izoh',
    'deals.create_btn': 'Shartnoma yaratish',
    'deals.details_title': 'Shartnoma',
    'deals.kpi_paid': 'To\'langan',
    'deals.kpi_remaining': 'Qarz qoldig\'i',
    'deals.payment_schedule': 'To\'lovlar grafigi',
    'deals.referral_info': 'Aloqador shaxs',
    'deals.delete_confirm': 'Ushbu shartnomani o\'chirishni xohlaysizmi? Bu uning barcha to\'lovlarini ham o\'chirib tashlaydi.',

    // Payments Page
    'payments.title': 'To\'lovlar',
    'payments.subtitle': 'Muddatli to\'lovlar taqvimi va grafigi',
    'payments.filter_all': 'Barcha to\'lovlar',
    'payments.filter_pending': 'Kutilayotgan',
    'payments.filter_paid': 'To\'langanlar',
    'payments.filter_overdue': 'Muddati o\'tganlar',
    'payments.filter_extended': 'Kechiktirilganlar',
    'payments.search_placeholder': 'Mijoz yoki mahsulot bo\'yicha qidiruv...',
    'payments.col_month': 'Oy',
    'payments.col_due_date': 'To\'lov sanasi',
    'payments.col_amount': 'Summa',
    'payments.col_status': 'Status',
    'payments.status_paid': 'To\'langan',
    'payments.status_pending': 'Kutilmoqda',
    'payments.status_overdue': 'Muddati o\'tgan',
    'payments.status_extended': 'Kechiktirilgan',
    'payments.remind_wa': 'WhatsApp orqali eslatish',
    'payments.remind_tg': 'Telegram orqali eslatish',
    'payments.mark_paid': 'To\'langan deb belgilash',
    'payments.extend_btn': 'Muddatini uzaytirish',
    'payments.extend_modal_title': 'To\'lov muddatini uzaytirish',
    'payments.extend_new_date': 'Yangi to\'lov sanasi',
    'payments.extend_confirm': 'Uzaytirishni tasdiqlash',

    // Monitoring Page
    'monitoring.title': 'To\'lovlar monitoringi',
    'monitoring.subtitle': 'To\'lov intizomi va qarzdorlik nazorati',
    'monitoring.total_debt': 'Jami kechikkan qarz',
    'monitoring.overdue_rate': 'Kechikish darajasi',
    'monitoring.clients_count': 'Kechikkan mijozlar soni',
    'monitoring.avg_delay': 'O\'rtacha kechikish',
    'monitoring.days_label': 'kun',
    'monitoring.debt_distribution': 'Qarzdorlik taqsimoti',
    'monitoring.debt_level_critical': 'Kritik (45+ kun)',
    'monitoring.debt_level_medium': 'O\'rtacha (15-45 kun)',
    'monitoring.debt_level_low': 'Past (1-15 kun)',

    // Reports Page
    'reports.title': 'Hisobotlar va Eksport',
    'reports.subtitle': 'Moliyaviy ma\'lumotlar va tahlillarni yuklab olish',
    'reports.export_db': 'Ma\'lumotlar bazasini yuklash (SQLite)',
    'reports.export_db_desc': 'Kompyuterga butun lokal ma\'lumotlar bazasining zaxira nusxasini saqlaydi.',
    'reports.import_db': 'Agent bazasini yuklash',
    'reports.import_db_desc': 'Boshqa SQLite faylidan ma\'lumotlarni import qiladi va birlashtiradi.',
    'reports.export_csv': 'Kelishuvlar hisobotini eksport qilish',
    'reports.export_csv_desc': 'Excel uchun kelishuvlar ro\'yxatini CSV shaklida yuklaydi.',
    'reports.sync_success': 'Ma\'lumotlar bazasini sinxronizatsiya qilish muvaffaqiyatli yakunlandi!',
    'reports.sync_error': 'Sinxronizatsiya xatosi:',
    'reports.export_success': 'Ma\'lumotlar bazasi muvaffaqiyatli yuklandi:',
    'reports.csv_success': 'Hisobot muvaffaqiyatli saqlandi:',
    'reports.db_cancelled': 'Amal foydalanuvchi tomonidan bekor qilindi',

    // Settings Page
    'settings.title': 'Tizim sozlamalari',
    'settings.subtitle': 'Platforma va til sozlamalari',
    'settings.company_name': 'Kompaniya nomi',
    'settings.penalty_rate': 'Penya stavkasi (kuniga %)',
    'settings.grace_period': 'Imtiyozli davr (kunlar)',
    'settings.language': 'Tizim tili',
    'settings.save_settings': 'Sozlamalarni saqlash',
    'settings.success_save': 'Sozlamalar muvaffaqiyatli saqlandi!',

    // Admin Dashboard Page
    'admin.title': 'Admin paneli',
    'admin.subtitle': 'Agentlarni boshqarish va umumiy statistika',
    'admin.total_agents': 'Jami agentlar',
    'admin.global_portfolio': 'Umumiy portfel',
    'admin.global_paid': 'Jami yig\'ilgan',
    'admin.global_overdue': 'Umumiy kechikish',
    'admin.agent_list': 'Agentlar ro\'yxati',
    'admin.add_agent': 'Agent qo\'shish',
    'admin.col_agent': 'Agent',
    'admin.col_role': 'Rol',
    'admin.col_deals': 'Kelishuvlar',
    'admin.col_portfolio': 'Portfel',
    'admin.col_overdue': 'Kechikishlar',
    'admin.modal_title': 'Yangi agent qo\'shish',
    'admin.field_email': 'Elektron pochta',
    'admin.field_password': 'Hisob paroli',
    'admin.field_role': 'Tizimdagi roli',
    'admin.role_agent': 'Agent (Cheklangan ruxsat)',
    'admin.role_admin': 'Administrator (To\'liq ruxsat)',
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('erp_language') as Language) || 'ru';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('erp_language', lang);
  };

  const t = (key: string): string => {
    const translationSet = translations[language];
    if (key in translationSet) {
      return (translationSet as any)[key];
    }
    // Fallback to Russian if not found in Uzbek
    if (language === 'uz' && key in translations.ru) {
      return (translations.ru as any)[key];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
