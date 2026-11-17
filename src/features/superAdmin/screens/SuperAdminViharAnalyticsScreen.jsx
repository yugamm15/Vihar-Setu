import React from 'react';
import { SuperAdminAnalyticsView } from '../components/SuperAdminAnalyticsView';
import { t } from '../../../core/localization/i18n';

export const SuperAdminViharAnalyticsScreen = ({ navigation }) => (
  <SuperAdminAnalyticsView type="vihars" title={t('super_admin.reports.vihar_analytics')} navigation={navigation} />
);
