"""Preserve all Greenwashing scenarios and check delayed shared layout as well."""
import test_greenwashing_browser as suite
original_shot = suite.shot

def reviewed_shot(page, label):
    if label.startswith('faculty-'):
        dashboard = page.locator('#rzGreenwashingFacultyAnalytics .gw-dashboard')
        live = page.locator('#rzGreenwashingStudentResults')
        if dashboard.count() and dashboard.is_visible():
            page.locator('#rzV15insightsMetrics').wait_for(state='attached')
            page.locator('#rzV151PresenterProgress').wait_for(state='attached')
            suite.check(label + ' no duplicate delayed shared summaries',
                        page.locator('#rzV15insightsMetrics').is_hidden()
                        and page.locator('#rzV151PresenterProgress').is_hidden())
            if page.viewport_size['width'] >= 1050 and label.endswith(('-presenter', '-empty', '-single')):
                page.evaluate('scrollTo({top:0,behavior:"instant"})')
                box = page.locator('#rzGreenwashingFacultyAnalytics .gw-priority').bounding_box()
                suite.check(label + ' priority charts fit after delayed refresh',
                            box is not None and box['y'] >= 0
                            and box['y'] + box['height'] <= page.viewport_size['height'] + 2, box)
        elif live.count() and live.is_visible():
            page.locator('#rzV15studentsMetrics').wait_for(state='attached')
            suite.check(label + ' no duplicate Live Responses summary',
                        page.locator('#rzV15studentsMetrics').is_hidden())
    original_shot(page, label)

if __name__ == '__main__':
    suite.shot = reviewed_shot
    suite.main()
