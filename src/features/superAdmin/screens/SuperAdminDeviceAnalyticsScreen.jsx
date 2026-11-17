import React from 'react';
import { SuperAdminAnalyticsView } from '../components/SuperAdminAnalyticsView';
import { t } from '../../../core/localization/i18n';

export const SuperAdminDeviceAnalyticsScreen = ({ navigation }) => (
  <SuperAdminAnalyticsView type="devices" title={t('super_admin.reports.device_analytics')} navigation={navigation} />
);
