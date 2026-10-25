"""Run the full mounted 1.4 suite with additional Hotel card readability checks.
The original scenarios, assertions and screenshot evidence remain intact.
"""
import test_design_code_v14 as suite

original_shot = suite.shot

def reviewed_shot(page, label):
    original_shot(page, label)
    if not label.startswith('hotel-'):
        return
    metrics = page.locator('.rz-a-dashboard[data-simulation=hotel] > .rz-a-panel:nth-child(2) > .rz-a-stats > .rz-a-metric:visible')
    if label.endswith(('-populated', '-text200')):
        suite.check(label + ' both released median cards visible', metrics.count() == 2)
    for index in range(metrics.count()):
        metric = metrics.nth(index)
        bounds = metric.bounding_box()
        title = metric.locator('.rz-a-label').bounding_box()
        value = metric.locator('strong').bounding_box()
        suite.check(label + ' median card ' + str(index) + ' remains readable',
                    bounds['width'] >= 100 and title['height'] <= 42 and value['height'] <= 72,
                    {'card': bounds, 'label': title, 'value': value})
        suite.check(label + ' median value ' + str(index) + ' does not overflow',
                    metric.locator('strong').evaluate('n=>n.scrollWidth<=n.clientWidth+2'))

if __name__ == '__main__':
    suite.shot = reviewed_shot
    suite.main()
