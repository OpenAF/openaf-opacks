import unittest

from live_aws import invocation_metrics


class MetricsTests(unittest.TestCase):
    def test_successful_cold_report(self):
        result = invocation_metrics('REPORT RequestId: test\tDuration: 100.50 ms\tBilled Duration: 601 ms\tMemory Size: 1024 MB\tMax Memory Used: 223 MB\tInit Duration: 500.25 ms')
        self.assertEqual(result, {'initPhaseTimeout': False, 'initMs': 500.25, 'durationMs': 100.5, 'maxMemoryMiB': 223.0})

    def test_failed_init_is_not_successful_init_duration(self):
        result = invocation_metrics('INIT_REPORT Init Duration: 9999.35 ms\tPhase: init\tStatus: timeout\n'
            'REPORT RequestId: test\tDuration: 12701.20 ms\tBilled Duration: 12702 ms\tMemory Size: 512 MB\tMax Memory Used: 223 MB')
        self.assertNotIn('initMs', result)
        self.assertEqual(result['failedInitMs'], 9999.35)
        self.assertTrue(result['initPhaseTimeout'])
        self.assertEqual(result['durationMs'], 12701.2)

    def test_warm_report_has_no_init_duration(self):
        result = invocation_metrics('REPORT RequestId: test\tDuration: 3.50 ms\tBilled Duration: 4 ms\tMax Memory Used: 224 MB')
        self.assertNotIn('initMs', result)
        self.assertEqual(result['durationMs'], 3.5)


if __name__ == '__main__':
    unittest.main()
