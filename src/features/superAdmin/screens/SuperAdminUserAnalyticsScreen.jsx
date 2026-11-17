import React from 'react';
import { SuperAdminAnalyticsView } from '../components/SuperAdminAnalyticsView';
import { t } from '../../../core/localization/i18n';

export const SuperAdminUserAnalyticsScreen = ({ navigation }) => (
  <SuperAdminAnalyticsView type="users" title={t('super_admin.reports.user_analytics')} navigation={navigation} />
);
