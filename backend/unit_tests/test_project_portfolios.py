import unittest
from pydantic import ValidationError
from portfolio_models import PortfolioCreate, portfolio_query

class PortfolioTests(unittest.TestCase):
    def test_ten_photos_and_trimmed_title(self):
        p = PortfolioCreate(title=' Kitchen ', images=['data:image/jpeg;base64,test']*10)
        self.assertEqual(p.title, 'Kitchen')
        self.assertEqual(len(p.images), 10)

    def test_reject_more_than_ten_and_empty_projects(self):
        for payload in [dict(title='Project', images=['x']*11), dict(title=' ', images=['x']), dict(title='Project', images=[]), dict(title='Project',images=[''])]:
            with self.subTest(payload=payload), self.assertRaises(ValidationError):
                PortfolioCreate(**payload)

    def test_legacy_single_photo(self):
        p = PortfolioCreate(title='Old project', image_base64='abc')
        self.assertEqual(p.images, ['data:image/jpeg;base64,abc'])

    def test_hidden_projects_only_visible_to_owner(self):
        self.assertNotIn('visible', portfolio_query('owner', {'id':'owner'}))
        for viewer in [None, {'id':'customer'}, {'id':'other-contractor'}]:
            self.assertEqual(portfolio_query('owner', viewer)['visible'], {'$ne':False})

    def test_multiple_signup_projects_keep_their_own_photos_and_visibility(self):
        projects=[PortfolioCreate(title='Kitchen', images=['kitchen'], visible=True), PortfolioCreate(title='Deck',images=['deck'],visible=False)]
        self.assertEqual(projects[0].images, ['kitchen'])
        self.assertEqual(projects[1].images, ['deck'])
        self.assertFalse(projects[1].model_dump()['visible'])

if __name__=='__main__': unittest.main()
