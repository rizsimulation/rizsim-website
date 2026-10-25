"""Run all native Big Five scenarios after shared delayed UI has mounted.
Keep the original assertions and screenshots; add real layout/duplication checks.
"""
import test_big_five_browser as suite

original_shot = suite.shot

def reviewed_shot(page, label):
    if label.startswith('faculty-'):
        dashboard = page.locator('#rzBigFiveFacultyAnalytics .bf-dashboard')
        live = page.locator('#rzBigFiveStudentResults .bf-live')
        if dashboard.count() and dashboard.is_visible():
            page.locator('#rzV15insightsMetrics').wait_for(state='attached')
            page.locator('#rzV151PresenterProgress').wait_for(state='attached')
            suite.check(label + ' delayed shared participation widgets are not duplicated',
                        page.locator('#rzV15insightsMetrics').is_hidden()
                        and page.locator('#rzV151PresenterProgress').is_hidden())
            if page.viewport_size['width'] >= 1050 and label.endswith(('-presenter', '-empty', '-single')):
                page.evaluate('scrollTo({top:0,behavior:"instant"})')
                bounds = page.locator('#rzBigFiveFacultyAnalytics .bf-priority').bounding_box()
                suite.check(label + ' priority graphs still fit after shared refresh',
                            bounds is not None and bounds['y'] >= 0
                            and bounds['y'] + bounds['height'] <= page.viewport_size['height'] + 2,
                            bounds)
        elif live.count() and live.is_visible():
            page.locator('#rzV15studentsMetrics').wait_for(state='attached')
            suite.check(label + ' Live Responses has one participation summary',
                        page.locator('#rzV15studentsMetrics').is_hidden())
    original_shot(page, label)

if __name__ == '__main__':
    suite.shot = reviewed_shot
    suite.main()
