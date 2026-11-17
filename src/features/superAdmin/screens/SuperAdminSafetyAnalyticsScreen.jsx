import React from 'react';
import { SuperAdminAnalyticsView } from '../components/SuperAdminAnalyticsView';
import { t } from '../../../core/localization/i18n';

export const SuperAdminSafetyAnalyticsScreen = ({ navigation }) => (
  <SuperAdminAnalyticsView type="safety" title={t('super_admin.reports.safety_analytics')} navigation={navigation} />
);
