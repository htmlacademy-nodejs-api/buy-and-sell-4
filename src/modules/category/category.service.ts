import { inject, injectable } from 'inversify';
import { DocumentType, ModelType } from '@typegoose/typegoose/lib/types.js';
import { CategoryServiceInterface } from './category-service.interface.js';
import { CategoryEntity } from './category.entity.js';
import CreateCategoryDto from './dto/create-category.dto.js';
import { AppComponent } from '../../types/app-component.enum.js';
import { LoggerInterface } from '../../core/logger/logger.interface.js';
import { DEFAULT_CATEGORIES_IMAGES, MAX_CATEGORIES_COUNT } from './category.constant.js';
import { SortType } from '../../types/sort-type.enum.js';
import { getRandomItem } from '../../core/helpers/index.js';

@injectable()
export default class CategoryService implements CategoryServiceInterface {
  constructor(
    @inject(AppComponent.LoggerInterface) private readonly logger: LoggerInterface,
    @inject(AppComponent.CategoryModel) private readonly categoryModel: ModelType<CategoryEntity>
  ) {}

  public async create(dto: CreateCategoryDto): Promise<DocumentType<CategoryEntity>> {
    const randomCategoryImage = getRandomItem(DEFAULT_CATEGORIES_IMAGES);
    const result = await this.categoryModel.create({...dto, image: randomCategoryImage});
    this.logger.info(`New category created: ${dto.name}`);
    return result;
  }

  public async findByCategoryId(categoryId: string): Promise<DocumentType<CategoryEntity> | null> {
    return this.categoryModel.findById(categoryId).exec();
  }

  public async findByCategoryName(categoryName: string): Promise<DocumentType<CategoryEntity> | null> {
    return this.categoryModel.findOne({name: categoryName}).exec();
  }

  public async findByCategoryNameOrCreate(categoryName: string, dto: CreateCategoryDto): Promise<DocumentType<CategoryEntity>> {
    const existedCategory = await this.findByCategoryName(categoryName);

    if (existedCategory) {
      return existedCategory;
    }

    return this.create(dto);
  }

  public async find(): Promise<DocumentType<CategoryEntity>[]> {
    return this.categoryModel
      .aggregate([
        {
          $lookup: {
            from: 'offers',
            let: { categoryId: '$_id'},
            pipeline: [
              { $match: { $expr: { $in: ['$$categoryId', '$categories'] } } },
              { $project: { _id: 1}}
            ],
            as: 'offers'
          },
        },
        { $addFields:
            { id: { $toString: '$_id'}, offerCount: { $size: '$offers'} }
        },
        { $unset: 'offers' },
        { $limit: MAX_CATEGORIES_COUNT },
        { $sort: { offerCount: SortType.Down } }
      ]).exec();
  }
}
