from typing import List, Optional
from typing_extensions import Annotated
from pydantic import BaseModel, Field, StringConstraints, model_validator

class PortfolioCreate(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
    description: Optional[str] = Field(default='', max_length=5000)
    images: List[str] = Field(default_factory=list, max_length=10)
    image_base64: Optional[str] = None
    visible: bool = True

    @model_validator(mode='after')
    def require_images(self):
        if not self.images and self.image_base64:
            image = self.image_base64
            self.images = [image if image.startswith('data:') else f'data:image/jpeg;base64,{image}']
        if not self.images or any(not image.strip() for image in self.images):
            raise ValueError('Add 1 to 10 photos to each project')
        return self

class PortfolioVisibility(BaseModel):
    visible: bool

def portfolio_query(contractor_id, viewer=None):
    query = {'contractor_id': contractor_id}
    if not viewer or viewer.get('id') != contractor_id:
        query['visible'] = {'$ne': False}
    return query
